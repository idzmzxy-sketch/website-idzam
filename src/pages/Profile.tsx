import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, Shield } from 'lucide-react';
import { toProfile, useAuth, type Profile as ProfileData } from '../auth';
import { useBackgrounds } from '../backgrounds';
import BackgroundCard from '../components/BackgroundCard';
import PageShell from '../components/PageShell';
import { db } from '../lib/firebase';
import { hrefFor, useRoute } from '../routes';

type LoadState = 'idle' | 'loading' | 'missing';

export default function Profile() {
  const { param } = useRoute();
  const { user, profile: me, ready, signOut } = useAuth();
  const { cloudItems } = useBackgrounds();

  const targetId = param ?? user?.uid ?? null;
  const isMe = !!user && targetId === user.uid;

  const [other, setOther] = useState<ProfileData | null>(null);
  const [state, setState] = useState<LoadState>('idle');

  useEffect(() => {
    const database = db;
    if (!database || !targetId || isMe) {
      setOther(null);
      setState('idle');
      return;
    }
    let active = true;
    setState('loading');
    getDoc(doc(database, 'users', targetId))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setOther(toProfile(snap.id, snap.data()));
          setState('idle');
        } else {
          setOther(null);
          setState('missing');
        }
      })
      .catch(() => {
        if (!active) return;
        setOther(null);
        setState('missing');
      });
    return () => {
      active = false;
    };
  }, [targetId, isMe]);

  const person = isMe ? me : other;
  const mine = cloudItems.filter((u) => u.uploaderId === targetId);

  if (!targetId) {
    return (
      <PageShell title="Profile">
        <div className="glass rounded-2xl sm:rounded-3xl p-6 flex flex-col gap-3 w-full max-w-md">
          <p className="text-sm text-white/85">{ready ? 'Sign in to see your profile.' : 'Loading...'}</p>
          {ready && (
            <a href={hrefFor('login')} className="btn-primary text-sm font-semibold py-3 rounded-2xl text-center">
              Start a project
            </a>
          )}
        </div>
      </PageShell>
    );
  }

  if (!person) {
    return (
      <PageShell title="Profile">
        <div className="glass rounded-2xl sm:rounded-3xl p-6 text-sm text-white/85 w-full max-w-md">
          {state === 'missing' ? 'This profile could not be found.' : 'Loading...'}
        </div>
      </PageShell>
    );
  }

  const initial = person.displayName.trim().charAt(0).toUpperCase() || '?';
  const joined = person.createdAt
    ? new Date(person.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null;

  return (
    <PageShell title={isMe ? 'Your profile' : person.displayName}>
      <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 w-full max-w-2xl">
        <div className="w-20 h-20 rounded-full overflow-hidden border border-white/50 bg-white/20 flex items-center justify-center text-3xl font-semibold shrink-0">
          {person.photoURL ? (
            <img src={person.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight break-words">
            {person.displayName}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2 py-1 font-medium">
              {person.role === 'admin' && <Shield size={12} />}
              {person.role === 'admin' ? 'Admin' : 'Member'}
            </span>
            {joined && <span className="text-white/70">Joined {joined}</span>}
            <span className="text-white/70">
              {mine.length} {mine.length === 1 ? 'upload' : 'uploads'}
            </span>
          </div>
        </div>
        {isMe && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-glass inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl"
          >
            <LogOut size={15} />
            Sign out
          </button>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-white text-lg font-semibold drop-shadow-lg">Uploads</h2>
        {mine.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-white/80">No uploads yet.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((b) => (
              <BackgroundCard key={b.id} source={b} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
