import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// No Firebase Storage here (it needs a paid plan), so photos and small files are saved as data
// URLs inside Firestore. A small preview travels with the post; the full version is a separate
// document that is only fetched when someone taps it.

export const MAX_FILE_BYTES = 690_000;
export const MAX_IMAGE_BYTES = 15_000_000;
const MAX_FULL_CHARS = 900_000;

export function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.startsWith('data:;') ? result.replace('data:;', 'data:application/octet-stream;') : result);
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('That image could not be opened. Try a JPG or PNG.'));
    el.src = src;
  });
}

function render(img: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export interface ImageVariants {
  thumb: string;
  full: string;
}

export async function makeImageVariants(file: File, thumbEdge = 480): Promise<ImageVariants> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That image is too large (15 MB max).');
  const img = await loadImage(await readAsDataURL(file));

  const fullSteps: [number, number][] = [[1600, 0.82], [1400, 0.72], [1200, 0.65], [1000, 0.6], [800, 0.55]];
  let full = '';
  for (const [edge, quality] of fullSteps) {
    full = render(img, edge, quality);
    if (full.length <= MAX_FULL_CHARS) break;
  }
  if (full.length > MAX_FULL_CHARS) throw new Error('That image is too detailed to share. Try a smaller one.');

  const thumbSteps: [number, number][] = [
    [thumbEdge, 0.65],
    [Math.round(thumbEdge * 0.75), 0.55],
    [Math.round(thumbEdge * 0.5), 0.5],
  ];
  let thumb = '';
  for (const [edge, quality] of thumbSteps) {
    thumb = render(img, edge, quality);
    if (thumb.length <= 100_000) break;
  }
  return { thumb, full };
}

export async function fetchMedia(collectionName: 'storyMedia' | 'chatMedia', id: string): Promise<string | null> {
  const database = db;
  if (!database) return null;
  const snap = await getDoc(doc(database, collectionName, id));
  const data = snap.data()?.data;
  return typeof data === 'string' && data.startsWith('data:') ? data : null;
}

export function downloadDataUrl(dataUrl: string, name: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name || 'file';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function isImageSrc(url: string | null | undefined): url is string {
  return !!url && (/^data:image\//i.test(url) || /^https:\/\//i.test(url));
}

export function describeError(e: unknown): string {
  const code = (e as { code?: string }).code;
  if (code === 'permission-denied') return 'Permission denied. Please sign in again, or try later.';
  if (code === 'unavailable') return 'You seem to be offline. Try again.';
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
