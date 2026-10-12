import { useCallback, useEffect, useState } from 'react';
import { NAV_ITEMS, hrefFor, type Route } from '../routes';
import { useAuth } from '../auth';
import { BackgroundButton, BackgroundPanel } from './BackgroundMenu';

type Panel = 'menu' | 'background' | null;

// Three bars that morph into an X; the bars also stretch when hovered.
function HamburgerIcon({ open }: { open: boolean }) {
  const bar = 'absolute h-0.5 rounded-full bg-current transition-all duration-300 ease-out';
  return (
    <span className="relative block w-5 h-4" aria-hidden="true">
      <span className={`${bar} left-0 ${open ? 'top-1/2 -translate-y-1/2 rotate-45 w-5' : 'top-0 w-5'}`} />
      <span
        className={`${bar} right-0 top-1/2 -translate-y-1/2 ${
          open ? 'opacity-0 w-0' : 'opacity-100 w-3.5 group-hover:w-5'
        }`}
      />
      <span
        className={`${bar} left-0 ${open ? 'top-1/2 -translate-y-1/2 -rotate-45 w-5' : 'bottom-0 w-4 group-hover:w-5'}`}
      />
    </span>
  );
}

// The same compact bar on phones and desktops: logo, background picker, sign-in / avatar, menu.
export default function Navbar({ route }: { route: Route }) {
  const [panel, setPanel] = useState<Panel>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    setPanel(null);
  }, [route]);

  useEffect(() => {
    if (panel !== 'menu') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  const menuOpen = panel === 'menu';
  const closeBackground = useCallback(() => setPanel((p) => (p === 'background' ? null : p)), []);
  const initial = (profile?.displayName ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="relative z-20 w-full sm:w-[26rem] self-start">
      <nav aria-label="Main" className="glass rounded-2xl pl-3 sm:pl-4 pr-2 py-2 w-full flex items-center gap-3">
        <a href={hrefFor('home')} aria-label="Idzam, home" className="flex items-center shrink-0">
          <svg width="32" height="32" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="#ffffff" />
          </svg>
        </a>

        <div className="ml-auto flex items-center gap-2">
          <BackgroundButton
            open={panel === 'background'}
            onToggle={() => setPanel(panel === 'background' ? null : 'background')}
          />

          {user ? (
            <a
              href={hrefFor('profile')}
              aria-label="Your profile"
              className="w-9 h-9 rounded-full overflow-hidden border border-white/50 bg-white/20 flex items-center justify-center text-sm font-semibold text-white hover:opacity-80 transition-opacity shrink-0"
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </a>
          ) : (
            <a href={hrefFor('login')} className="btn-primary text-sm px-4 sm:px-5 py-2 rounded-xl whitespace-nowrap">
              <span className="hidden min-[400px]:inline">Start a project</span>
              <span className="min-[400px]:hidden">Start</span>
            </a>
          )}

          <button
            type="button"
            className="btn-glass group w-9 h-9 rounded-xl flex items-center justify-center"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            onClick={() => setPanel(menuOpen ? null : 'menu')}
          >
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      <BackgroundPanel open={panel === 'background'} onClose={closeBackground} />

      <div
        id="main-menu"
        aria-hidden={!menuOpen}
        className={`glass absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 flex flex-col origin-top transition-[opacity,transform,visibility] duration-300 ease-out ${
          menuOpen
            ? 'opacity-100 translate-y-0 scale-100 visible'
            : 'opacity-0 -translate-y-2 scale-95 invisible pointer-events-none'
        }`}
      >
        {[{ route: 'home' as Route, label: 'Home' }, ...NAV_ITEMS].map((item, i) => {
          const active = route === item.route;
          return (
            <a
              key={item.route}
              href={hrefFor(item.route)}
              aria-current={active ? 'page' : undefined}
              style={{ transitionDelay: menuOpen ? `${70 + i * 45}ms` : '0ms' }}
              className={`text-white text-sm font-medium px-4 py-3 rounded-xl transition-[opacity,transform,background-color] duration-300 ease-out ${
                menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              } ${active ? 'bg-white/25' : 'hover:bg-white/15'}`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </header>
  );
}
