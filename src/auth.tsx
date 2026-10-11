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
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { auth, backendReady, db } from './lib/firebase';

export type Role = 'admin' | 'user';

export interface Profile {
  id: string;
  displayName: string;
  photoURL: string | null;
  role: Role;
  createdAt: string | null;
}

export function toProfile(id: string, data: DocumentData): Profile {
  const ts = data.createdAt;
  return {
    id,
    displayName: String(data.displayName ?? 'Member'),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    role: data.role === 'admin' ? 'admin' : 'user',
    createdAt: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null,
  };
}

/**
 * First account ever = admin. The first sign-in tries to create `config/admin` together with an
 * admin profile in ONE batch; the Firestore rules only allow that while `config/admin` does not
 * exist yet. Everyone after that falls back to a normal "user" profile.
 */
async function ensureProfile(database: Firestore, user: User): Promise<Profile> {
  const ref = doc(database, 'users', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return toProfile(user.uid, existing.data());

  const base = {
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Member',
    photoURL: user.photoURL ?? null,
  };

  try {
    const batch = writeBatch(database);
    batch.set(doc(database, 'config', 'admin'), { uid: user.uid });
    batch.set(ref, { ...base, role: 'admin', createdAt: serverTimestamp() });
    await batch.commit();
  } catch {
    await setDoc(ref, { ...base, role: 'user', createdAt: serverTimestamp() });
  }

  const created = await getDoc(ref);
  return toProfile(user.uid, created.data() ?? base);
}

interface AuthValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** false while the first sign-in / profile check is still running */
  ready: boolean;
  backendReady: boolean;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(!auth);
  const [profileChecked, setProfileChecked] = useState(true);

  useEffect(() => {
    const a = auth;
    if (!a) return;
    return onAuthStateChanged(a, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    const database = db;
    if (!database || !user) {
      setProfile(null);
      setProfileChecked(true);
      return;
    }
    let active = true;
    setProfileChecked(false);
    ensureProfile(database, user)
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setProfileChecked(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    const a = auth;
    if (!a) return 'Sign in is not available yet.';
    try {
      await signInWithPopup(a, new GoogleAuthProvider());
      window.location.hash = '#/profile';
      return null;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
      if (code === 'auth/popup-blocked') return 'Your browser blocked the Google window. Allow pop-ups and try again.';
      if (code === 'auth/unauthorized-domain') {
        return 'This site address is not allowed yet. Add it in Firebase → Authentication → Settings → Authorized domains.';
      }
      return e instanceof Error ? e.message : 'Could not sign in. Try again.';
    }
  }, []);

  const signOut = useCallback(async () => {
    const a = auth;
    if (!a) return;
    await firebaseSignOut(a);
    window.location.hash = '#/';
  }, []);

  const effectiveProfile = useMemo<Profile | null>(() => {
    if (profile) return profile;
    if (!user) return null;
    return {
      id: user.uid,
      displayName: user.displayName ?? user.email ?? 'Member',
      photoURL: user.photoURL ?? null,
      role: 'user',
      createdAt: null,
    };
  }, [profile, user]);

  const value: AuthValue = {
    user,
    profile: effectiveProfile,
    isAdmin: effectiveProfile?.role === 'admin',
    ready: authChecked && profileChecked,
    backendReady,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
