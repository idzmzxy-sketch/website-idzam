import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Download, FileText, Paperclip, SendHorizonal, Trash2, X } from 'lucide-react';
import { useAuth } from '../auth';
import PageShell from '../components/PageShell';
import RemoteImage from '../components/RemoteImage';
import { db } from '../lib/firebase';
import {
  MAX_FILE_BYTES,
  describeError,
  downloadDataUrl,
  fetchMedia,
  formatSize,
  formatTime,
  isImageSrc,
  makeImageVariants,
  readAsDataURL,
} from '../lib/media';
import { hrefFor } from '../routes';
import { inputClass } from '../styles';

interface Attachment {
  kind: 'image' | 'file';
  name: string;
  size: number;
  mime: string;
  thumb: string | null;
  mediaId: string;
}

interface ChatItem {
  id: string;
  text: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto: string | null;
  createdAt: string | null;
  attachment: Attachment | null;
}

function parseAttachment(a: unknown): Attachment | null {
  if (!a || typeof a !== 'object') return null;
  const x = a as Record<string, unknown>;
  if (typeof x.mediaId !== 'string') return null;
  return {
    kind: x.kind === 'image' ? 'image' : 'file',
    name: typeof x.name === 'string' ? x.name : 'file',
    size: typeof x.size === 'number' ? x.size : 0,
    mime: typeof x.mime === 'string' ? x.mime : 'application/octet-stream',
    thumb: typeof x.thumb === 'string' ? x.thumb : null,
    mediaId: x.mediaId,
  };
}

function fromDoc(d: QueryDocumentSnapshot<DocumentData>): ChatItem {
  const x = d.data({ serverTimestamps: 'estimate' });
  const ts = x.createdAt;
  return {
    id: d.id,
    text: String(x.text ?? ''),
    ownerId: String(x.ownerId ?? ''),
    ownerName: String(x.ownerName ?? 'Member'),
    ownerPhoto: typeof x.ownerPhoto === 'string' ? x.ownerPhoto : null,
    createdAt: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null,
    attachment: parseAttachment(x.attachment),
  };
}

function FileChip({ attachment }: { attachment: Attachment }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await fetchMedia('chatMedia', attachment.mediaId);
      if (!data) throw new Error('The file could not be loaded.');
      downloadDataUrl(data, attachment.name);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2 text-left text-sm disabled:opacity-60 max-w-full"
      >
        <FileText size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
        <span className="opacity-70 shrink-0">{formatSize(attachment.size)}</span>
        <Download size={14} className="shrink-0" />
      </button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}

export default function Community() {
  const { user, profile, isAdmin, ready, backendReady } = useAuth();
  const uid = user?.uid ?? null;

  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listenError, setListenError] = useState('');
  const [input, setInput] = useState('');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const lastSent = useRef(0);

  useEffect(() => {
    const database = db;
    if (!database || !uid) {
      setMessages([]);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    const q = query(collection(database, 'chat'), orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map(fromDoc).reverse());
        setListenError('');
        setLoaded(true);
      },
      () => {
        setListenError('Could not load messages. Make sure the latest firestore.rules are published.');
        setLoaded(true);
      }
    );
  }, [uid]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || messages.length === 0) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || stick.current) {
      el.scrollTo({ top: el.scrollHeight });
      stick.current = false;
    }
  }, [messages]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    setError('');
    if (!f) return;
    if (!f.type.startsWith('image/') && f.size > MAX_FILE_BYTES) {
      setError(`Files must be under ${formatSize(MAX_FILE_BYTES)}. Photos are resized automatically.`);
      return;
    }
    setAttachFile(f);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !attachFile) || busy) return;
    const database = db;
    if (!database || !user || !profile) return;
    if (Date.now() - lastSent.current < 1500) {
      setError('Slow down a little.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const batch = writeBatch(database);
      let attachment: Attachment | null = null;

      if (attachFile) {
        const mediaRef = doc(collection(database, 'chatMedia'));
        if (attachFile.type.startsWith('image/')) {
          const v = await makeImageVariants(attachFile, 320);
          batch.set(mediaRef, {
            ownerId: user.uid,
            data: v.full,
            mime: 'image/jpeg',
            name: attachFile.name,
            size: v.full.length,
            createdAt: serverTimestamp(),
          });
          attachment = { kind: 'image', name: attachFile.name, size: attachFile.size, mime: 'image/jpeg', thumb: v.thumb, mediaId: mediaRef.id };
        } else {
          batch.set(mediaRef, {
            ownerId: user.uid,
            data: await readAsDataURL(attachFile),
            mime: attachFile.type || 'application/octet-stream',
            name: attachFile.name,
            size: attachFile.size,
            createdAt: serverTimestamp(),
          });
          attachment = {
            kind: 'file',
            name: attachFile.name,
            size: attachFile.size,
            mime: attachFile.type || 'application/octet-stream',
            thumb: null,
            mediaId: mediaRef.id,
          };
        }
      }

      batch.set(doc(collection(database, 'chat')), {
        text,
        ownerId: user.uid,
        ownerName: profile.displayName,
        ownerPhoto: profile.photoURL,
        createdAt: serverTimestamp(),
        attachment,
      });
      await batch.commit();
      lastSent.current = Date.now();
      stick.current = true;
      setInput('');
      setAttachFile(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const remove = async (m: ChatItem) => {
    const database = db;
    if (!database || !window.confirm('Delete this message?')) return;
    try {
      await deleteDoc(doc(database, 'chat', m.id));
      if (m.attachment) await deleteDoc(doc(database, 'chatMedia', m.attachment.mediaId)).catch(() => undefined);
    } catch (e) {
      setError(describeError(e));
    }
  };

  let gate: string | null = null;
  if (!backendReady) gate = 'Community chat is not available yet. Please check back soon.';
  else if (!ready) gate = 'Loading...';

  return (
    <PageShell title="Community" subtitle="One chat for everyone. Share photos and small files.">
      <section className="glass rounded-2xl sm:rounded-3xl flex flex-col w-full max-w-3xl h-[min(72dvh,680px)] min-h-[380px] overflow-hidden">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
          {gate && <p className="m-auto text-center text-sm text-white/80">{gate}</p>}
          {!gate && !user && (
            <p className="m-auto text-center text-sm text-white/80 max-w-xs">Sign in to read and join the chat.</p>
          )}
          {user && !loaded && <p className="m-auto text-center text-sm text-white/80">Loading messages...</p>}
          {user && loaded && messages.length === 0 && !listenError && (
            <p className="m-auto text-center text-sm text-white/70">No messages yet. Say hello!</p>
          )}
          {listenError && <p className="m-auto text-center text-sm text-red-200 max-w-xs">{listenError}</p>}

          {messages.map((m) => {
            const mine = m.ownerId === uid;
            const canDelete = mine || isAdmin;
            return (
              <div key={m.id} className={`group flex flex-col gap-1 max-w-[88%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                <div className="flex items-center gap-1.5 text-xs text-white/75">
                  {!mine && (
                    <a href={hrefFor('profile', m.ownerId)} className="inline-flex items-center gap-1.5 font-medium text-white hover:underline">
                      {m.ownerPhoto && (
                        <img src={m.ownerPhoto} alt="" referrerPolicy="no-referrer" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      {m.ownerName}
                    </a>
                  )}
                  <span>{formatTime(m.createdAt)}</span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void remove(m)}
                      aria-label="Delete message"
                      className="opacity-60 hover:opacity-100 hover:text-red-200 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm break-words flex flex-col gap-2 ${
                    mine
                      ? 'bg-white/90 text-black rounded-br-md'
                      : 'bg-white/15 border border-white/25 text-white rounded-bl-md'
                  }`}
                >
                  {m.attachment?.kind === 'image' && isImageSrc(m.attachment.thumb) && (
                    <RemoteImage
                      thumb={m.attachment.thumb}
                      alt={m.attachment.name}
                      caption={m.text || undefined}
                      className="rounded-xl max-h-60 w-auto max-w-full"
                      loadFull={() => fetchMedia('chatMedia', (m.attachment as Attachment).mediaId)}
                    />
                  )}
                  {m.attachment?.kind === 'file' && <FileChip attachment={m.attachment} />}
                  {m.text && <span className="whitespace-pre-wrap">{m.text}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="px-4 sm:px-5 pb-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="border-t border-white/20 p-3 sm:p-4 flex flex-col gap-2">
          {attachFile && (
            <div className="inline-flex items-center gap-2 self-start max-w-full rounded-xl bg-white/15 border border-white/25 px-3 py-1.5 text-xs">
              <Paperclip size={13} className="shrink-0" />
              <span className="truncate">{attachFile.name}</span>
              <button type="button" onClick={() => setAttachFile(null)} aria-label="Remove attachment" className="shrink-0 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {!gate && !user ? (
            <a href={hrefFor('login')} className="btn-primary block text-center text-sm font-semibold py-3 rounded-2xl">
              Sign in to chat
            </a>
          ) : (
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" className="hidden" onChange={onPick} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!!gate || busy}
                aria-label="Attach a photo or file"
                className="btn-glass w-11 h-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <Paperclip size={18} />
              </button>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a message..."
                aria-label="Message"
                maxLength={1000}
                disabled={!!gate}
                className={`flex-1 min-w-0 resize-none max-h-32 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || (!input.trim() && !attachFile) || !!gate}
                aria-label="Send"
                className="btn-primary w-11 h-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
