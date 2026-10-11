import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SendHorizonal, Trash2 } from 'lucide-react';
import { useAuth } from '../auth';
import PageShell from '../components/PageShell';
import { hrefFor } from '../routes';
import { inputClass } from '../styles';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'idzam:chat';
const KEEP = 40;
const SEND = 12;

function loadMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ChatMessage[])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-KEEP);
  } catch {
    return [];
  }
}

export default function Chat() {
  const { user, ready, backendReady } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-KEEP)));
    } catch {
      /* storage blocked: the chat just is not remembered */
    }
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !user) return;
    setError('');
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next.slice(-SEND) }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string; error?: string } | null;
      if (!res.ok || !data?.reply) throw new Error(data?.error ?? `Request failed (${res.status}).`);
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
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

  const clear = () => {
    if (messages.length === 0 || !window.confirm('Clear this conversation?')) return;
    setMessages([]);
    setError('');
  };

  let gate: string | null = null;
  if (!backendReady) gate = 'Chat is not available yet. Please check back soon.';
  else if (!ready) gate = 'Loading...';

  return (
    <PageShell
      title="AI Chat"
      subtitle="Ask anything. Replies come from an AI model."
      action={
        messages.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="btn-glass inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
          >
            <Trash2 size={15} />
            Clear
          </button>
        ) : undefined
      }
    >
      <section className="glass rounded-2xl sm:rounded-3xl flex flex-col w-full max-w-3xl h-[min(68dvh,640px)] min-h-[360px] overflow-hidden">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
          {messages.length === 0 && !gate && (
            <p className="m-auto text-center text-sm text-white/70 max-w-xs">
              {user ? 'Say hi to start the conversation.' : 'Sign in to start chatting.'}
            </p>
          )}
          {gate && <p className="m-auto text-center text-sm text-white/80">{gate}</p>}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'self-end bg-white/90 text-black rounded-br-md'
                  : 'self-start bg-white/15 border border-white/25 text-white rounded-bl-md'
              }`}
            >
              {m.content}
            </div>
          ))}

          {busy && (
            <div
              className="self-start bg-white/15 border border-white/25 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5"
              aria-label="The assistant is typing"
              role="status"
            >
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="px-4 sm:px-5 pb-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="border-t border-white/20 p-3 sm:p-4">
          {!gate && !user ? (
            <a href={hrefFor('login')} className="btn-primary block text-center text-sm font-semibold py-3 rounded-2xl">
              Sign in to chat
            </a>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a message..."
                aria-label="Message"
                maxLength={4000}
                disabled={!!gate}
                className={`flex-1 min-w-0 resize-none max-h-32 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !input.trim() || !!gate}
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
