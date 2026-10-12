import { useEffect, useState } from 'react';

export type Route =
  | 'home'
  | 'story'
  | 'expertise'
  | 'work'
  | 'tools'
  | 'contact'
  | 'login'
  | 'profile'
  | 'chat'
  | 'community';

export interface RouteState {
  route: Route;
  param: string | null;
}

export const NAV_ITEMS: { route: Route; label: string }[] = [
  { route: 'story', label: 'Our story' },
  { route: 'expertise', label: 'Expertise' },
  { route: 'work', label: 'Our work' },
  { route: 'tools', label: 'Tools' },
  { route: 'chat', label: 'AI Chat' },
  { route: 'community', label: 'Community' },
];

export const PAGE_TITLES: Record<Route, string> = {
  home: 'Idzam — Bold ideas, shipped as products',
  story: 'Our story — Idzam',
  expertise: 'Expertise — Idzam',
  work: 'Our work — Idzam',
  tools: 'Tools — Idzam',
  contact: 'Say hello — Idzam',
  login: 'Start a project — Idzam',
  profile: 'Profile — Idzam',
  chat: 'AI Chat — Idzam',
  community: 'Community — Idzam',
};

export function hrefFor(route: Route, param?: string): string {
  if (route === 'home') return '#/';
  return param ? `#/${route}/${encodeURIComponent(param)}` : `#/${route}`;
}

const KNOWN: Exclude<Route, 'home'>[] = ['story', 'expertise', 'work', 'tools', 'contact', 'login', 'profile', 'chat', 'community'];

function parseHash(hash: string): RouteState {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const [key, rawParam] = path.split('/');
  const route: Route = KNOWN.find((r) => r === key) ?? 'home';
  let param: string | null = null;
  if (rawParam) {
    try {
      param = decodeURIComponent(rawParam);
    } catch {
      param = null;
    }
  }
  return { route, param };
}

export function useRoute(): RouteState {
  const [state, setState] = useState<RouteState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setState(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}
