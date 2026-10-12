import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import siteData from './data/backgrounds.json';
import { useAuth } from './auth';
import { db } from './lib/firebase';
import {
  BUILTIN_BACKGROUNDS,
  DEFAULT_BG_ID,
  mediaTypeFromUrl,
  normalizeHttpsUrl,
  type BgSource,
} from './lib/backgrounds';

const CHOICE_KEY = 'idzam:background';
const CLOUD_PREFIX = 'cloud:';

/* ---------- Backgrounds listed in the repo: src/data/backgrounds.json ---------- */

interface SiteItem {
  id: string;
  title: string;
  description?: string;
  type?: 'video' | 'image';
  src: string;
}
interface SiteFile {
  default?: string;
  items?: SiteItem[];
}

const site = siteData as unknown as SiteFile;

const SITE_ITEMS: BgSource[] = (site.items ?? [])
  .filter((i) => i && typeof i.id === 'string' && typeof i.title === 'string' && typeof i.src === 'string')
  .map((i) => ({
    id: `site:${i.id}`,
    title: i.title,
    description: i.description ?? '',
    mediaType: i.type === 'image' || i.type === 'video' ? i.type : mediaTypeFromUrl(i.src),
    url: i.src,
    origin: 'site' as const,
  }));

const REPO_DEFAULT_ID = site.default
  ? site.default.startsWith('builtin:')
    ? site.default
    : `site:${site.default}`
  : DEFAULT_BG_ID;

/* ---------- Backgrounds shared by members: Firestore ---------- */

interface CloudSettings {
  defaultBackground: string | null;
  allowUserUploads: boolean;
}

function fromDoc(d: QueryDocumentSnapshot<DocumentData>): BgSource {
  const x = d.data();
  const ts = x.createdAt;
  return {
    id: `${CLOUD_PREFIX}${d.id}`,
    title: String(x.title ?? ''),
    description: String(x.description ?? ''),
    mediaType: x.mediaType === 'image' ? 'image' : 'video',
    url: typeof x.url === 'string' ? x.url : undefined,
    origin: 'cloud',
    uploaderId: typeof x.uploaderId === 'string' ? x.uploaderId : null,
    uploaderName: typeof x.uploaderName === 'string' ? x.uploaderName : null,
    uploaderAvatar: typeof x.uploaderPhoto === 'string' ? x.uploaderPhoto : null,
    createdAt: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null,
  };
}

function describeError(e: unknown): string {
  const code = (e as { code?: string }).code;
  if (code === 'permission-denied') return 'You do not have permission to do that.';
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}

function checkMeta(input: { title: string; description: string }): string | null {
  const title = input.title.trim();
  if (!title) return 'Add a title first.';
  if (title.length > 80) return 'The title can be at most 80 characters.';
  if (input.description.trim().length > 300) return 'The description can be at most 300 characters.';
  return null;
}

function readChoice(): string | null {
  try {
    return window.localStorage.getItem(CHOICE_KEY);
  } catch {
    return null;
  }
}

/* ---------- Context ---------- */

interface BackgroundsValue {
  all: BgSource[];
  builtins: BgSource[];
  siteItems: BgSource[];
  cloudItems: BgSource[];
  active: BgSource;
  activeId: string;
  siteDefaultId: string;
  allowUserUploads: boolean;
  loading: boolean;
  hasChoice: boolean;
  canUpload: boolean;
  canDelete: (b: BgSource) => boolean;
  choose: (id: string) => void;
  followDefault: () => void;
  setDefault: (id: string) => Promise<string | null>;
  setAllowUserUploads: (value: boolean) => Promise<string | null>;
  addLink: (input: { title: string; description: string; url: string }) => Promise<string | null>;
  remove: (b: BgSource) => Promise<string | null>;
}

const BackgroundsContext = createContext<BackgroundsValue | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const [cloudItems, setCloudItems] = useState<BgSource[]>([]);
  const [settings, setSettings] = useState<CloudSettings>({ defaultBackground: null, allowUserUploads: false });
  const [loading, setLoading] = useState<boolean>(!!db);
  const [choice, setChoice] = useState<string | null>(readChoice);

  const refresh = useCallback(async () => {
    const database = db;
    if (!database) {
      setLoading(false);
      return;
    }
    try {
      const [siteSnap, listSnap] = await Promise.all([
        getDoc(doc(database, 'config', 'site')),
        getDocs(query(collection(database, 'backgrounds'), orderBy('createdAt', 'desc'), limit(100))),
      ]);
      if (siteSnap.exists()) {
        const d = siteSnap.data();
        setSettings({
          defaultBackground: typeof d.defaultBackground === 'string' ? d.defaultBackground : null,
          allowUserUploads: d.allowUserUploads === true,
        });
      }
      setCloudItems(listSnap.docs.map(fromDoc));
    } catch {
      /* offline, or Firestore rules not published yet: just show the built-in backgrounds */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const all = useMemo(() => [...BUILTIN_BACKGROUNDS, ...SITE_ITEMS, ...cloudItems], [cloudItems]);
  const byId = useMemo(() => new Map(all.map((b) => [b.id, b])), [all]);

  const siteDefaultId =
    settings.defaultBackground && byId.has(settings.defaultBackground)
      ? settings.defaultBackground
      : byId.has(REPO_DEFAULT_ID)
        ? REPO_DEFAULT_ID
        : DEFAULT_BG_ID;

  const hasChoice = choice !== null && byId.has(choice);
  const activeId = hasChoice ? (choice as string) : siteDefaultId;
  const active = byId.get(activeId) ?? BUILTIN_BACKGROUNDS[0];

  const choose = useCallback((id: string) => {
    setChoice(id);
    try {
      window.localStorage.setItem(CHOICE_KEY, id);
    } catch {
      /* storage blocked: the choice just lasts for this visit */
    }
  }, []);

  const followDefault = useCallback(() => {
    setChoice(null);
    try {
      window.localStorage.removeItem(CHOICE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const writeSettings = useCallback(
    async (patch: Partial<{ defaultBackground: string; allowUserUploads: boolean }>): Promise<string | null> => {
      const database = db;
      if (!database || !isAdmin) return 'Only an admin can do that.';
      try {
        await setDoc(doc(database, 'config', 'site'), patch, { merge: true });
        setSettings((s) => ({ ...s, ...patch }));
        return null;
      } catch (e) {
        return describeError(e);
      }
    },
    [isAdmin]
  );

  const setDefault = useCallback((id: string) => writeSettings({ defaultBackground: id }), [writeSettings]);
  const setAllowUserUploads = useCallback(
    (value: boolean) => writeSettings({ allowUserUploads: value }),
    [writeSettings]
  );

  const addLink = useCallback(
    async (input: { title: string; description: string; url: string }): Promise<string | null> => {
      const database = db;
      if (!database || !user || !profile) return 'Please sign in first.';
      const metaError = checkMeta(input);
      if (metaError) return metaError;
      const url = normalizeHttpsUrl(input.url);
      if (!url) return 'Enter a valid https link to an .mp4 video or an image.';
      if (url.length > 1000) return 'That link is too long.';
      try {
        await addDoc(collection(database, 'backgrounds'), {
          title: input.title.trim(),
          description: input.description.trim(),
          url,
          mediaType: mediaTypeFromUrl(url),
          uploaderId: user.uid,
          uploaderName: profile.displayName,
          uploaderPhoto: profile.photoURL,
          createdAt: serverTimestamp(),
        });
        await refresh();
        return null;
      } catch (e) {
        return describeError(e);
      }
    },
    [user, profile, refresh]
  );

  const canDelete = useCallback(
    (b: BgSource) => b.origin === 'cloud' && !!user && (isAdmin || b.uploaderId === user.uid),
    [user, isAdmin]
  );

  const remove = useCallback(
    async (b: BgSource): Promise<string | null> => {
      const database = db;
      if (!database || !user) return 'Please sign in first.';
      if (!b.id.startsWith(CLOUD_PREFIX)) return 'This background cannot be deleted here.';
      try {
        await deleteDoc(doc(database, 'backgrounds', b.id.slice(CLOUD_PREFIX.length)));
        if (isAdmin && settings.defaultBackground === b.id) {
          await setDoc(doc(database, 'config', 'site'), { defaultBackground: DEFAULT_BG_ID }, { merge: true });
          setSettings((s) => ({ ...s, defaultBackground: DEFAULT_BG_ID }));
        }
        setCloudItems((prev) => prev.filter((i) => i.id !== b.id));
        return null;
      } catch (e) {
        return describeError(e);
      }
    },
    [user, isAdmin, settings.defaultBackground]
  );

  const value: BackgroundsValue = {
    all,
    builtins: BUILTIN_BACKGROUNDS,
    siteItems: SITE_ITEMS,
    cloudItems,
    active,
    activeId,
    siteDefaultId,
    allowUserUploads: settings.allowUserUploads,
    loading,
    hasChoice,
    canUpload: !!user && (isAdmin || settings.allowUserUploads),
    canDelete,
    choose,
    followDefault,
    setDefault,
    setAllowUserUploads,
    addLink,
    remove,
  };

  return <BackgroundsContext.Provider value={value}>{children}</BackgroundsContext.Provider>;
}

export function useBackgrounds(): BackgroundsValue {
  const ctx = useContext(BackgroundsContext);
  if (!ctx) throw new Error('useBackgrounds must be used inside <BackgroundProvider>');
  return ctx;
}
