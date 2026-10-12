import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  StickyNote,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth';
import { STORY_DEFAULTS } from '../data/content';
import { normalizeHttpsUrl } from '../lib/backgrounds';
import { db } from '../lib/firebase';
import {
  MAX_FILE_BYTES,
  describeError,
  downloadDataUrl,
  fetchMedia,
  formatDate,
  formatSize,
  isImageSrc,
  makeImageVariants,
  readAsDataURL,
} from '../lib/media';
import { hrefFor } from '../routes';
import { inputClass } from '../styles';
import PageShell from './PageShell';
import RemoteImage from './RemoteImage';

type Kind = 'note' | 'image' | 'file' | 'link';

interface StoryItem {
  id: string;
  kind: Kind;
  title: string;
  description: string;
  url: string | null;
  thumb: string | null;
  mediaId: string | null;
  fileName: string | null;
  fileSize: number | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerPhoto: string | null;
  createdAt: string | null;
  builtin: boolean;
}

const KIND_META: Record<Kind, { label: string; Icon: LucideIcon }> = {
  note: { label: 'Note', Icon: StickyNote },
  image: { label: 'Image', Icon: ImageIcon },
  file: { label: 'File', Icon: FileText },
  link: { label: 'Link', Icon: LinkIcon },
};
const KINDS: Kind[] = ['note', 'image', 'file', 'link'];

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function fromDoc(d: QueryDocumentSnapshot<DocumentData>): StoryItem {
  const x = d.data({ serverTimestamps: 'estimate' });
  const ts = x.createdAt;
  const kind: Kind = KINDS.includes(x.kind) ? x.kind : 'note';
  return {
    id: d.id,
    kind,
    title: String(x.title ?? ''),
    description: String(x.description ?? ''),
    url: str(x.url),
    thumb: str(x.thumb),
    mediaId: str(x.mediaId),
    fileName: str(x.fileName),
    fileSize: typeof x.fileSize === 'number' ? x.fileSize : null,
    ownerId: str(x.ownerId),
    ownerName: str(x.ownerName),
    ownerPhoto: str(x.ownerPhoto),
    createdAt: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null,
    builtin: false,
  };
}

const BUILTIN_ITEMS: StoryItem[] = STORY_DEFAULTS.map((d) => ({
  id: `builtin-${d.id}`,
  kind: 'note',
  title: d.title,
  description: d.description,
  url: null,
  thumb: null,
  mediaId: null,
  fileName: null,
  fileSize: null,
  ownerId: null,
  ownerName: null,
  ownerPhoto: null,
  createdAt: null,
  builtin: true,
}));

function StoryCard({ item, canDelete, onDelete }: { item: StoryItem; canDelete: boolean; onDelete: () => void }) {
  const { label, Icon } = KIND_META[item.kind];
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    if (!item.mediaId) return;
    setDownloading(true);
    setError('');
    try {
      const data = await fetchMedia('storyMedia', item.mediaId);
      if (!data) throw new Error('The file could not be loaded.');
      downloadDataUrl(data, item.fileName ?? item.title);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setDownloading(false);
    }
  };

  const mediaId = item.mediaId;

  return (
    <article className="glass rounded-2xl overflow-hidden flex flex-col">
      {item.kind === 'image' && isImageSrc(item.thumb) &&
        (mediaId ? (
          <RemoteImage
            thumb={item.thumb}
            alt={item.title}
            caption={item.description || undefined}
            className="w-full aspect-video object-cover"
            loadFull={() => fetchMedia('storyMedia', mediaId)}
          />
        ) : (
          <img src={item.thumb} alt={item.title} loading="lazy" className="w-full aspect-video object-cover" />
        ))}

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/20 rounded-lg px-2 py-1">
            <Icon size={12} />
            {label}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${item.title}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-red-200 hover:bg-white/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <h3 className="text-base font-semibold text-white break-words">{item.title}</h3>
        {item.description && <p className="text-sm text-white/75 whitespace-pre-line break-words">{item.description}</p>}

        {item.kind === 'link' && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-200 hover:underline break-all"
          >
            Open link <ExternalLink size={14} className="shrink-0" />
          </a>
        )}

        {item.kind === 'file' && item.mediaId && (
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloading}
            className="btn-glass inline-flex items-center gap-2 self-start text-sm px-3 py-2 rounded-xl disabled:opacity-60 max-w-full"
          >
            <Download size={14} className="shrink-0" />
            <span className="truncate">{downloading ? 'Loading...' : (item.fileName ?? 'Download')}</span>
            {item.fileSize ? <span className="text-white/70 shrink-0">{formatSize(item.fileSize)}</span> : null}
          </button>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
        )}

        <p className="mt-auto pt-2 text-xs text-white/70 flex flex-wrap items-center gap-1.5">
          {item.builtin ? (
            'From Idzam'
          ) : (
            <>
              <span>by</span>
              {item.ownerId ? (
                <a
                  href={hrefFor('profile', item.ownerId)}
                  className="inline-flex items-center gap-1.5 font-medium text-white hover:underline"
                >
                  {item.ownerPhoto && (
                    <img src={item.ownerPhoto} alt="" referrerPolicy="no-referrer" className="w-4 h-4 rounded-full object-cover" />
                  )}
                  {item.ownerName ?? 'Member'}
                </a>
              ) : (
                <span>Member</span>
              )}
              {item.createdAt && <span aria-hidden="true">·</span>}
              {item.createdAt && <span>{formatDate(item.createdAt)}</span>}
            </>
          )}
        </p>
      </div>
    </article>
  );
}

export default function StoryBoard() {
  const { user, profile, isAdmin, ready, backendReady } = useAuth();
  const [cloud, setCloud] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!!db);
  const [loadError, setLoadError] = useState('');

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Kind>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const database = db;
    if (!database) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(query(collection(database, 'stories'), orderBy('createdAt', 'desc'), limit(50)));
      setCloud(snap.docs.map(fromDoc));
      setLoadError('');
    } catch {
      setLoadError('Could not load shared stories right now.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setKind('note');
    setTitle('');
    setDescription('');
    setLink('');
    setFile(null);
    setError('');
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const database = db;
    if (!database || !user || !profile) {
      setError('Please sign in first.');
      return;
    }
    const t = title.trim();
    const desc = description.trim();
    if (!t) return setError('Add a title first.');
    if (t.length > 80) return setError('The title can be at most 80 characters.');
    if (desc.length > 600) return setError('The description can be at most 600 characters.');

    setBusy(true);
    try {
      const batch = writeBatch(database);
      const storyRef = doc(collection(database, 'stories'));
      const data = {
        kind,
        title: t,
        description: desc,
        url: null as string | null,
        thumb: null as string | null,
        mediaId: null as string | null,
        fileName: null as string | null,
        fileSize: null as number | null,
        ownerId: user.uid,
        ownerName: profile.displayName,
        ownerPhoto: profile.photoURL,
        createdAt: serverTimestamp(),
      };

      if (kind === 'link') {
        const url = normalizeHttpsUrl(link);
        if (!url) throw new Error('Enter a valid https link, for example https://example.com');
        data.url = url;
      } else if (kind === 'image') {
        if (!file) throw new Error('Choose an image first.');
        const variants = await makeImageVariants(file);
        const mediaRef = doc(collection(database, 'storyMedia'));
        batch.set(mediaRef, {
          ownerId: user.uid,
          data: variants.full,
          mime: 'image/jpeg',
          name: file.name,
          size: variants.full.length,
          createdAt: serverTimestamp(),
        });
        data.thumb = variants.thumb;
        data.mediaId = mediaRef.id;
      } else if (kind === 'file') {
        if (!file) throw new Error('Choose a file first.');
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`Files must be under ${formatSize(MAX_FILE_BYTES)}. Add a link for bigger files.`);
        }
        const mediaRef = doc(collection(database, 'storyMedia'));
        batch.set(mediaRef, {
          ownerId: user.uid,
          data: await readAsDataURL(file),
          mime: file.type || 'application/octet-stream',
          name: file.name,
          size: file.size,
          createdAt: serverTimestamp(),
        });
        data.mediaId = mediaRef.id;
        data.fileName = file.name;
        data.fileSize = file.size;
      }

      batch.set(storyRef, data);
      await batch.commit();
      resetForm();
      setAdding(false);
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: StoryItem) => {
    const database = db;
    if (!database || !window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(database, 'stories', item.id));
      if (item.mediaId) await deleteDoc(doc(database, 'storyMedia', item.mediaId)).catch(() => undefined);
      setCloud((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      window.alert(describeError(err));
    }
  };

  let action;
  if (backendReady && user) {
    action = (
      <button
        type="button"
        aria-expanded={adding}
        onClick={() => {
          if (adding) resetForm();
          setAdding((v) => !v);
        }}
        className="btn-primary inline-flex items-center gap-2 text-sm px-4 sm:px-5 py-2.5 rounded-xl"
      >
        {adding ? <X size={16} /> : <Plus size={16} />}
        {adding ? 'Close' : 'Add'}
      </button>
    );
  } else if (backendReady && ready) {
    action = (
      <a href={hrefFor('login')} className="btn-primary inline-flex items-center gap-2 text-sm px-4 sm:px-5 py-2.5 rounded-xl">
        Sign in to add
      </a>
    );
  }

  const items = [...cloud, ...BUILTIN_ITEMS];

  return (
    <PageShell title="Our story" subtitle="Posts from Idzam and the community. Everyone can read them." action={action}>
      {adding && user && (
        <form
          onSubmit={(e) => void submit(e)}
          className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 w-full max-w-2xl"
        >
          <h2 className="text-xl font-semibold text-white tracking-tight">New post</h2>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Post type">
            {KINDS.map((k) => {
              const { label, Icon } = KIND_META[k];
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={k === kind}
                  onClick={() => {
                    setKind(k);
                    setFile(null);
                    setError('');
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                    k === kind ? 'chip-active' : 'chip'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            placeholder="Title"
            aria-label="Title"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full ${inputClass}`}
          />
          <textarea
            rows={3}
            placeholder="Description"
            aria-label="Description"
            maxLength={600}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full resize-none ${inputClass}`}
          />

          {kind === 'link' && (
            <input
              type="text"
              inputMode="url"
              placeholder="https://example.com"
              aria-label="Link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={`w-full ${inputClass}`}
            />
          )}
          {(kind === 'image' || kind === 'file') && (
            <div className="flex flex-col gap-1.5">
              <input
                key={kind}
                type="file"
                accept={kind === 'image' ? 'image/*' : undefined}
                aria-label={kind === 'image' ? 'Image file' : 'File'}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-white/30"
              />
              <p className="text-xs text-white/60">
                {kind === 'image'
                  ? 'Photos are resized automatically.'
                  : `Files up to ${formatSize(MAX_FILE_BYTES)}. Use a link for anything bigger.`}
              </p>
            </div>
          )}

          <p className="text-xs text-white/70">Everyone can see this post, along with your name.</p>

          {error && (
            <p role="alert" className="text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full text-sm font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {busy ? 'Posting...' : 'Post'}
          </button>
        </form>
      )}

      {loadError && (
        <p role="alert" className="text-sm text-red-200">
          {loadError}
        </p>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-white/80">Loading...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <StoryCard
              key={item.id}
              item={item}
              canDelete={!item.builtin && !!user && (isAdmin || item.ownerId === user.uid)}
              onDelete={() => void remove(item)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
