import { useState, type FormEvent } from 'react';
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
import PageShell from './PageShell';
import ZoomableImage from './ZoomableImage';
import type { ContentItem, ItemKind } from '../data/content';
import { inputClass, glassPanelClass } from '../styles';

const MAX_FILE_BYTES = 1_000_000;
const MAX_IMAGE_EDGE = 1600;

const KIND_META: Record<ItemKind, { label: string; Icon: LucideIcon }> = {
  note: { label: 'Note', Icon: StickyNote },
  image: { label: 'Image', Icon: ImageIcon },
  file: { label: 'File', Icon: FileText },
  link: { label: 'Link', Icon: LinkIcon },
};
const KINDS: ItemKind[] = ['note', 'image', 'file', 'link'];

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  const src = await readAsDataURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('That image could not be opened.'));
    el.src = src;
  });
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(withProtocol);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function isHttp(url?: string): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

function isImageSrc(url?: string): url is string {
  return !!url && (/^data:image\//i.test(url) || isHttp(url));
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function loadItems(storageKey: string, defaults: ContentItem[]): ContentItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContentItem[]) : defaults;
  } catch {
    return defaults;
  }
}

function saveItems(storageKey: string, items: ContentItem[]): boolean {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function ItemCard({ item, onRemove }: { item: ContentItem; onRemove: () => void }) {
  const { label, Icon } = KIND_META[item.kind];
  return (
    <article className="glass rounded-2xl overflow-hidden flex flex-col">
      {item.kind === 'image' && isImageSrc(item.url) && (
        <ZoomableImage
          src={item.url}
          alt={item.title}
          caption={item.description || undefined}
          className="w-full aspect-video object-cover"
        />
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/20 rounded-lg px-2 py-1">
            <Icon size={12} />
            {label}
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.title}`}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-red-200 hover:bg-white/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <h3 className="text-base font-semibold text-white break-words">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-white/75 whitespace-pre-line break-words">{item.description}</p>
        )}
        {item.kind === 'link' && isHttp(item.url) && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-200 hover:underline break-all"
          >
            Open link <ExternalLink size={14} className="shrink-0" />
          </a>
        )}
        {item.kind === 'file' && item.url && /^data:/i.test(item.url) && (
          <a
            href={item.url}
            download={item.fileName ?? item.title}
            className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-200 hover:underline break-all"
          >
            <Download size={14} className="shrink-0" />
            {item.fileName ?? 'Download file'}
            {item.fileSize ? ` (${formatSize(item.fileSize)})` : ''}
          </a>
        )}
      </div>
    </article>
  );
}

interface ContentBoardProps {
  storageKey: string;
  title: string;
  subtitle: string;
  defaults: ContentItem[];
}

export default function ContentBoard({ storageKey, title, subtitle, defaults }: ContentBoardProps) {
  const key = `idzam:${storageKey}`;
  const [items, setItems] = useState<ContentItem[]>(() => loadItems(key, defaults));
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ItemKind>('note');
  const [itemTitle, setItemTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setKind('note');
    setItemTitle('');
    setDescription('');
    setLink('');
    setFile(null);
    setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const trimmed = itemTitle.trim();
    if (!trimmed) {
      setError('Add a title first.');
      return;
    }
    const item: ContentItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      title: trimmed,
      description: description.trim(),
    };
    setBusy(true);
    try {
      if (kind === 'link') {
        const url = normalizeUrl(link);
        if (!url) throw new Error('Enter a valid link, for example https://example.com');
        item.url = url;
      } else if (kind === 'image') {
        if (!file) throw new Error('Choose an image first.');
        if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');
        item.url = await compressImage(file);
      } else if (kind === 'file') {
        if (!file) throw new Error('Choose a file first.');
        if (file.size > MAX_FILE_BYTES) {
          throw new Error('Files must be under 1 MB. Add a link for bigger files.');
        }
        item.url = await readAsDataURL(file);
        item.fileName = file.name;
        item.fileSize = file.size;
      }
      const next = [item, ...items];
      if (!saveItems(key, next)) {
        throw new Error('This browser is out of storage space. Remove an entry or use a smaller file.');
      }
      setItems(next);
      resetForm();
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    if (!window.confirm('Remove this entry?')) return;
    const next = items.filter((i) => i.id !== id);
    saveItems(key, next);
    setItems(next);
  };

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      action={
        <button
          type="button"
          onClick={() => {
            if (adding) resetForm();
            setAdding((v) => !v);
          }}
          aria-expanded={adding}
          className="btn-primary inline-flex items-center gap-2 text-sm px-4 sm:px-5 py-2.5 rounded-xl"
        >
          {adding ? <X size={16} /> : <Plus size={16} />}
          {adding ? 'Close' : 'Add'}
        </button>
      }
    >
      {adding && (
        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 w-full max-w-2xl"
        >
          <h2 className="text-xl font-semibold text-white tracking-tight">New entry</h2>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Entry type">
            {KINDS.map((k) => {
              const active = k === kind;
              const { label, Icon } = KIND_META[k];
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setKind(k);
                    setFile(null);
                    setError('');
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                    active
                      ? 'chip-active'
                      : 'chip'
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
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            className={`w-full ${inputClass}`}
          />
          <textarea
            rows={3}
            placeholder="Description"
            aria-label="Description"
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
            <input
              key={kind}
              type="file"
              accept={kind === 'image' ? 'image/*' : undefined}
              aria-label={kind === 'image' ? 'Image file' : 'File'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-white/30"
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-red-200">
              {error}
            </p>
          )}
          <p className="text-xs text-white/60">Entries are saved in this browser only.</p>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full text-sm font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {busy ? 'Saving...' : 'Add to page'}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className={`${glassPanelClass} p-6 text-center text-sm text-white/80`}>
          Nothing here yet. Press Add to put in your first entry.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onRemove={() => remove(item.id)} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
