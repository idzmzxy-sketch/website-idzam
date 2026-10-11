import { useState } from 'react';
import { Plus, Shield, X } from 'lucide-react';
import { useAuth } from '../auth';
import { useBackgrounds } from '../backgrounds';
import BackgroundCard from '../components/BackgroundCard';
import PageShell from '../components/PageShell';
import UploadForm from '../components/UploadForm';

export default function Work() {
  const { builtins, siteItems, cloudItems, all, siteDefaultId, allowUserUploads, canUpload, loading, setAllowUserUploads } =
    useBackgrounds();
  const { isAdmin, backendReady } = useAuth();
  const [adding, setAdding] = useState(false);
  const [adminError, setAdminError] = useState('');

  const defaultTitle = all.find((b) => b.id === siteDefaultId)?.title ?? 'Meadow';

  const toggleUploads = async (value: boolean) => {
    setAdminError('');
    const err = await setAllowUserUploads(value);
    if (err) setAdminError(err);
  };

  return (
    <PageShell
      title="Our work"
      subtitle="Backgrounds for the whole site. Pick one to use on your screen."
      action={
        canUpload ? (
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => setAdding((v) => !v)}
            className="btn-primary inline-flex items-center gap-2 text-sm px-4 sm:px-5 py-2.5 rounded-xl"
          >
            {adding ? <X size={16} /> : <Plus size={16} />}
            {adding ? 'Close' : 'Share'}
          </button>
        ) : undefined
      }
    >
      {isAdmin && (
        <section className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3 max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Shield size={16} /> Admin controls
          </h2>
          <label className="flex items-start gap-3 text-sm text-white/90 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-white"
              checked={allowUserUploads}
              onChange={(e) => void toggleUploads(e.target.checked)}
            />
            <span>Let every signed-in member share backgrounds (otherwise only admins can).</span>
          </label>
          <p className="text-sm text-white/75">
            Site default: <strong className="text-white">{defaultTitle}</strong>. Visitors who have not picked a
            background see this one. Press "Set as default" on any card to change it.
          </p>
          {adminError && (
            <p role="alert" className="text-sm text-red-200">
              {adminError}
            </p>
          )}
        </section>
      )}

      {adding && canUpload && <UploadForm onDone={() => setAdding(false)} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-white text-lg font-semibold drop-shadow-lg">Themes</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {builtins.map((b) => (
            <BackgroundCard key={b.id} source={b} />
          ))}
        </div>
      </section>

      {siteItems.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-white text-lg font-semibold drop-shadow-lg">From Idzam</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {siteItems.map((b) => (
              <BackgroundCard key={b.id} source={b} />
            ))}
          </div>
        </section>
      )}

      {backendReady && (
        <section className="flex flex-col gap-3">
          <h2 className="text-white text-lg font-semibold drop-shadow-lg">Shared by members</h2>
          {loading ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-white/80">Loading...</div>
          ) : cloudItems.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-white/80">
              No shared backgrounds yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cloudItems.map((b) => (
                <BackgroundCard key={b.id} source={b} />
              ))}
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}
