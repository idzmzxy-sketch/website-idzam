import { VIDEO_URL } from '../constants';

export type MediaType = 'video' | 'image' | 'css';
/** builtin = themes in the code, site = backgrounds.json in the repo, cloud = shared by members */
export type Origin = 'builtin' | 'site' | 'cloud';

export interface BgSource {
  id: string;
  title: string;
  description: string;
  mediaType: MediaType;
  url?: string;
  themeClass?: string;
  origin: Origin;
  uploaderId?: string | null;
  uploaderName?: string | null;
  uploaderAvatar?: string | null;
  createdAt?: string | null;
}

export const DEFAULT_BG_ID = 'builtin:meadow';

function theme(id: string, title: string, description: string, themeClass: string): BgSource {
  return { id, title, description, mediaType: 'css', themeClass, origin: 'builtin' };
}

export const BUILTIN_BACKGROUNDS: BgSource[] = [
  {
    id: DEFAULT_BG_ID,
    title: 'Meadow',
    description: 'The original sky and valley video.',
    mediaType: 'video',
    url: VIDEO_URL,
    origin: 'builtin',
  },
  theme('builtin:aurora', 'Aurora', 'Slow shifting blues, teal and violet. Loops forever.', 'theme-aurora'),
  theme('builtin:sunset', 'Sunset', 'Warm pink and orange glow. Loops forever.', 'theme-sunset'),
  theme('builtin:ocean', 'Ocean', 'Deep teal water. Loops forever.', 'theme-ocean'),
  theme('builtin:midnight', 'Midnight', 'Dark violet night. Loops forever.', 'theme-midnight'),
];

export function mediaTypeFromUrl(url: string): 'video' | 'image' {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url) ? 'video' : 'image';
}

/** Only https links are allowed (http would be blocked on the deployed site anyway). */
export function normalizeHttpsUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(withProtocol);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
