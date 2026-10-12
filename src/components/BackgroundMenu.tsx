import { useEffect } from 'react';
import { Check, Palette } from 'lucide-react';
import { useBackgrounds } from '../backgrounds';
import { hrefFor } from '../routes';
import BgPreview from './BgPreview';

// The button lives inside the navbar; the panel is rendered next to the navbar (not inside it)
// so its glass blur can see the background behind it.

export function BackgroundButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-bg-menu
      aria-label="Change background"
      aria-expanded={open}
      onClick={onToggle}
      className="btn-glass w-9 h-9 rounded-xl flex items-center justify-center"
    >
      <Palette size={18} />
    </button>
  );
}

export function BackgroundPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { all, activeId, siteDefaultId, choose, followDefault, hasChoice } = useBackgrounds();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (e.target instanceof Element && !e.target.closest('[data-bg-menu]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-bg-menu
      className="glass absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 max-h-[70vh] overflow-y-auto"
    >
      <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-white/70">Background</p>
      <ul className="flex flex-col">
        {all.map((b) => {
          const active = b.id === activeId;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => choose(b.id)}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors ${
                  active ? 'bg-white/25' : 'hover:bg-white/15'
                }`}
              >
                <BgPreview source={b} className="w-10 h-10 rounded-lg shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{b.title}</span>
                  {siteDefaultId === b.id && (
                    <span className="block text-xs text-white/70">Site default</span>
                  )}
                </span>
                {active && <Check size={16} className="shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 text-xs">
        {hasChoice ? (
          <button type="button" onClick={followDefault} className="text-white/85 hover:text-white underline underline-offset-2">
            Use site default
          </button>
        ) : (
          <span className="text-white/60">Following site default</span>
        )}
        <a href={hrefFor('work')} className="text-white/85 hover:text-white underline underline-offset-2">
          Upload &amp; manage
        </a>
      </div>
    </div>
  );
}
