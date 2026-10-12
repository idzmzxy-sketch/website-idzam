import { useCallback, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { useAuth } from '../auth';
import { useBackgrounds } from '../backgrounds';
import type { BgSource } from '../lib/backgrounds';
import { hrefFor } from '../routes';
import BgPreview from './BgPreview';
import Lightbox from './Lightbox';

export default function BackgroundCard({ source }: { source: BgSource }) {
  const { activeId, siteDefaultId, choose, canDelete, setDefault, remove } = useBackgrounds();
  const { isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(false);
  const closeZoom = useCallback(() => setZoom(false), []);

  const active = activeId === source.id;
  const isDefault = siteDefaultId === source.id;

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError('');
    const err = await fn();
    if (err) setError(err);
    setBusy(false);
  };

  const onDelete = () => {
    if (!window.confirm(`Delete "${source.title}"? This cannot be undone.`)) return;
    void run(() => remove(source));
  };

  return (
    <article className="glass rounded-2xl overflow-hidden flex flex-col">
      <div className="relative">
        <BgPreview source={source} className="w-full aspect-video" />
        {source.mediaType === 'image' && source.url && (
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label={`View ${source.title} larger`}
            className="absolute inset-0 cursor-zoom-in"
          />
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {active && <span className="text-xs font-medium rounded-lg px-2 py-1 bg-white/90 text-black">In use</span>}
          {isDefault && (
            <span className="text-xs font-medium rounded-lg px-2 py-1 bg-black/50 text-white backdrop-blur-sm">
              Site default
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-base font-semibold text-white break-words">{source.title}</h3>
        {source.description && <p className="text-sm text-white/75 break-words">{source.description}</p>}

        <p className="text-xs text-white/70 flex items-center gap-1.5">
          {source.origin === 'builtin' && 'Built in'}
          {source.origin === 'site' && 'From Idzam'}
          {source.origin === 'cloud' && (
            <>
              <span>by</span>
              {source.uploaderId ? (
                <a
                  href={hrefFor('profile', source.uploaderId)}
                  className="inline-flex items-center gap-1.5 font-medium text-white hover:underline"
                >
                  {source.uploaderAvatar && (
                    <img src={source.uploaderAvatar} alt="" referrerPolicy="no-referrer" className="w-4 h-4 rounded-full object-cover" />
                  )}
                  {source.uploaderName ?? 'Member'}
                </a>
              ) : (
                <span>Member</span>
              )}
            </>
          )}
        </p>

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => choose(source.id)}
            disabled={active}
            className="btn-primary text-sm px-4 py-2 rounded-xl disabled:opacity-60"
          >
            {active ? 'In use' : 'Use'}
          </button>
          {isAdmin && !isDefault && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => setDefault(source.id))}
              className="btn-glass inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl disabled:opacity-60"
            >
              <Star size={14} />
              Set as default
            </button>
          )}
          {canDelete(source) && (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              aria-label={`Delete ${source.title}`}
              className="btn-glass ml-auto w-9 h-9 rounded-xl flex items-center justify-center hover:!bg-red-500/40 disabled:opacity-60"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
      {zoom && source.url && (
        <Lightbox src={source.url} alt={source.title} caption={source.description || undefined} onClose={closeZoom} />
      )}
    </article>
  );
}
