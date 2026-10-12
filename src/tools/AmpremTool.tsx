import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Send,
  ShieldCheck,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import { hrefFor } from '../routes';
import { glassPanelClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../styles';

type ServerKey = 'amprem1' | 'amprem2';
type Mode = 'send' | 'verify' | 'auto';

interface ToolResult {
  ok: boolean;
  title: string;
  message: string;
  idToken: string | null;
}

const SERVER_LABEL: Record<ServerKey, string> = {
  amprem1: 'Server 1',
  amprem2: 'Server 2',
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function extractToken(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.idToken === 'string') return obj.idToken;
  if (typeof obj.token === 'string') return obj.token;
  for (const v of Object.values(obj)) {
    const found = extractToken(v);
    if (found) return found;
  }
  return null;
}

async function callApi(server: ServerKey, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/${server}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data;
}

export default function AmpremTool() {
  const [server, setServer] = useState<ServerKey>('amprem2');
  const [mode, setMode] = useState<Mode>('send');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [progress, setProgress] = useState('');

  const reset = () => {
    setResult(null);
    setProgress('');
  };

  const switchServer = (s: ServerKey) => {
    setServer(s);
    setMode('send');
    reset();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const doSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const target = email.trim();
    if (!target) return;
    setBusy(true);
    reset();
    try {
      const data = await callApi(server, { action: 'send', email: target });
      setResult({
        ok: true,
        title: 'Link terkirim',
        message: `Cek inbox ${target} untuk link verifikasi, lalu tempel di tab "Verifikasi".`,
        idToken: extractToken(data),
      });
    } catch (err) {
      setResult({
        ok: false,
        title: 'Gagal mengirim',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        idToken: null,
      });
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const target = email.trim();
    const l = link.trim();
    if (!target || !l) return;
    setBusy(true);
    reset();
    try {
      const data = await callApi(server, { action: 'verify', email: target, link: l });
      const raw = data as { ok?: boolean; data?: { success?: boolean } };
      const ok = raw?.data?.success === true;
      setResult({
        ok,
        title: ok ? 'Premium aktif!' : 'Verifikasi gagal',
        message: ok
          ? `Akun ${target} berhasil diaktifkan.`
          : 'Server menolak permintaan verifikasi. Coba link lain atau ulangi.',
        idToken: extractToken(data),
      });
    } catch (err) {
      setResult({
        ok: false,
        title: 'Gagal verifikasi',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        idToken: null,
      });
    } finally {
      setBusy(false);
    }
  };

  const doAuto = async () => {
    if (busy) return;
    setBusy(true);
    reset();
    try {
      setProgress('Membuat email sementara...');
      const a = (await callApi('amprem2', { action: 'autofill' })) as { ok?: boolean; email?: string };
      if (!a?.email) throw new Error('Gagal membuat email sementara.');
      setEmail(a.email);

      setProgress(`Mengirim verifikasi ke ${a.email}...`);
      const s = (await callApi('amprem2', { action: 'send', email: a.email })) as {
        ok?: boolean;
        error?: string;
      };
      if (!s?.ok) throw new Error(s?.error ?? 'Gagal mengirim verifikasi.');

      let found: string | null = null;
      for (let i = 0; i < 25; i++) {
        await sleep(3500);
        setProgress(`Menunggu link di inbox... (${i + 1}/25)`);
        const inbox = (await callApi('amprem2', { action: 'inbox', email: a.email })) as {
          ok?: boolean;
          link?: string | null;
        };
        if (inbox?.ok && inbox.link) {
          found = inbox.link;
          break;
        }
      }
      if (!found) throw new Error('Timeout: link verifikasi tidak ditemukan.');

      setProgress('Memverifikasi...');
      const v = await callApi('amprem2', { action: 'verify', email: a.email, link: found });
      const raw = v as { data?: { success?: boolean } };
      const ok = raw?.data?.success === true;
      setResult({
        ok,
        title: ok ? 'Premium aktif!' : 'Verifikasi gagal',
        message: ok ? `Akun ${a.email} berhasil diaktifkan.` : 'Server menolak verifikasi. Coba lagi.',
        idToken: extractToken(v),
      });
    } catch (err) {
      setResult({
        ok: false,
        title: 'Gagal',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        idToken: null,
      });
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const modes: { key: Mode; label: string; Icon: LucideIcon }[] =
    server === 'amprem1'
      ? [
          { key: 'send', label: 'Kirim Verif', Icon: Send },
          { key: 'verify', label: 'Verifikasi', Icon: ShieldCheck },
        ]
      : [
          { key: 'send', label: 'Kirim Verif', Icon: Send },
          { key: 'verify', label: 'Verifikasi', Icon: ShieldCheck },
          { key: 'auto', label: 'Otomatis', Icon: Wand2 },
        ];

  return (
    <PageShell
      title="AlightMotion Premium"
      subtitle="Aktifkan premium lewat link verifikasi. Pilih server, kirim, lalu verifikasi."
      action={
        <a href={hrefFor('tools')} className={secondaryButtonClass}>
          <ArrowLeft size={15} />
          Kembali
        </a>
      }
    >
      <div className="flex flex-col gap-4 w-full max-w-2xl">
        {/* Server selector */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Server">
          {(['amprem1', 'amprem2'] as ServerKey[]).map((s) => {
            const active = server === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => switchServer(s)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                  active ? 'chip-active' : 'chip'
                }`}
              >
                {SERVER_LABEL[s]}
              </button>
            );
          })}
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mode">
          {modes.map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => switchMode(key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                  active ? 'chip-active' : 'chip'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Send / Verify form */}
        {(mode === 'send' || mode === 'verify') && (
          <form
            onSubmit={(e) => void (mode === 'send' ? doSend(e) : doVerify(e))}
            className={`${glassPanelClass} p-4 sm:p-6 flex flex-col gap-4`}
          >
            <h2 className="text-xl font-semibold text-white tracking-tight">
              {mode === 'send' ? 'Kirim link verifikasi' : 'Verifikasi & aktifkan premium'}
            </h2>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="amprem-email" className="text-sm font-medium text-white">
                Email target
              </label>
              <input
                id="amprem-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@domain.com"
                className={`w-full ${inputClass}`}
              />
            </div>

            {mode === 'verify' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="amprem-link" className="text-sm font-medium text-white">
                  Link verifikasi
                </label>
                <textarea
                  id="amprem-link"
                  required
                  rows={3}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Paste link verifikasi dari email..."
                  className={`w-full resize-none ${inputClass}`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-2xl disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'send' ? (
                <Send size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              {busy ? 'Memproses...' : mode === 'send' ? 'Kirim Link Verifikasi' : 'Verifikasi & Premium'}
            </button>
          </form>
        )}

        {/* Auto mode (Server 2 only) */}
        {mode === 'auto' && (
          <div className={`${glassPanelClass} p-4 sm:p-6 flex flex-col gap-4`}>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-white tracking-tight">Mode otomatis</h2>
              <p className="text-sm text-white/80">
                Email sementara dibuat, verifikasi dikirim, link ditunggu, lalu premium diaktifkan. Tidak perlu
                paste apa pun.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void doAuto()}
              disabled={busy}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-2xl disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {busy ? 'Memproses...' : 'Mulai Otomatis'}
            </button>
            {progress && (
              <p className="text-xs text-white/70" role="status">
                {progress}
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`${glassPanelClass} p-4 sm:p-6 flex flex-col gap-3 ${
              result.ok ? 'ring-1 ring-emerald-300/40' : 'ring-1 ring-red-300/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  result.ok ? 'bg-emerald-400/25 text-emerald-100' : 'bg-red-400/25 text-red-100'
                }`}
              >
                {result.ok ? <Check size={16} /> : <AlertCircle size={16} />}
              </div>
              <h3 className="text-base font-semibold text-white">{result.title}</h3>
            </div>
            <p className="text-sm text-white/85 whitespace-pre-wrap break-words">{result.message}</p>

            {result.idToken && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-white/70">ID Token</span>
                <div className="flex items-start gap-2">
                  <code className="flex-1 min-w-0 text-xs text-white/90 bg-black/30 rounded-lg px-3 py-2 break-all max-h-40 overflow-y-auto">
                    {result.idToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copy(result.idToken as string)}
                    aria-label="Copy ID token"
                    className="btn-glass w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}