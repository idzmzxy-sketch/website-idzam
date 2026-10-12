import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Server 2 (generator-alightmotion-premium-zerozx.rf.gd).
// Handler ini urus cookie __test (AES-128-CBC), kirim verifikasi lewat FormData,
// baca inbox generator.email, dan verifikasi. Client tinggal panggil action:
//   autofill → { email }
//   send     → { email }
//   inbox    → { email }
//   verify   → { email, link }

export const config = { maxDuration: 60 };

const BASE_URL = 'https://generator-alightmotion-premium-zerozx.rf.gd';
const DEFAULT_COOKIE = '__test=725c621e056285b5593b483cdaf0b258';
const UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36';

const NAMES = ['delta', 'alpha', 'beta', 'gamma', 'sigma', 'omega'];
const DOMAINS = ['rexornge.net'];

function generateEmail(): string {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const digits = Math.floor(Math.random() * 9900) + 100;
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  return `${name}${digits}@${domain}`;
}

async function fetchCookie(): Promise<string> {
  try {
    const r = await fetch(BASE_URL, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
      },
      redirect: 'follow',
    });

    const setCookie = r.headers.get('set-cookie');
    if (setCookie) {
      const m = setCookie.match(/__test=([^;]+)/);
      if (m) return `__test=${m[1]}`;
    }

    const html = await r.text();
    const m = html.match(
      /var a=toNumbers\("([^"]+)"\),b=toNumbers\("([^"]+)"\),c=toNumbers\("([^"]+)"\)/
    );
    if (!m) return DEFAULT_COOKIE;

    const [, keyHex, ivHex, cipherHex] = m;
    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');

    try {
      const d = crypto.createDecipheriv('aes-128-cbc', key, iv);
      const out = Buffer.concat([d.update(ciphertext), d.final()]);
      return `__test=${out.toString('hex')}`;
    } catch {
      return DEFAULT_COOKIE;
    }
  } catch {
    return DEFAULT_COOKIE;
  }
}

function apiHeaders(cookie: string): Record<string, string> {
  return {
    'User-Agent': UA,
    Origin: BASE_URL,
    Referer: `${BASE_URL}/?i=1`,
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    Accept: 'application/json',
    Cookie: cookie,
  };
}

interface InboxResult {
  ok: boolean;
  link?: string | null;
  body?: string;
  error?: string;
}

async function readInbox(email: string): Promise<InboxResult> {
  const [username, domain] = email.split('@');
  if (!username || !domain) return { ok: false, error: 'Bad email.' };

  const url = `https://generator.email/${domain}/${username}`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
        Cookie: `inbox_ctx=${domain}%2F${username}`,
      },
    });
    const html = await r.text();

    const firebase = html.match(/https:\/\/alight-creative\.firebaseapp\.com[^\s"'<>]+/);
    if (firebase) return { ok: true, link: firebase[0] };

    const bodyMatch = html.match(
      /<div[^>]*class="[^"]*mess_bodiyy[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    if (bodyMatch) {
      const inner = bodyMatch[1];
      const anchor = inner.match(/href="([^"]+)"/);
      const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return { ok: true, link: anchor?.[1] ?? null, body: text };
    }
    return { ok: true, link: null, body: '' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Inbox unreachable.' };
  }
}

interface UpstreamResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

async function postForm(path: string, fields: Record<string, string>): Promise<UpstreamResult> {
  const cookie = await fetchCookie();
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);

  try {
    const r = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: apiHeaders(cookie),
      body: fd,
    });
    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upstream unreachable.' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { action, email, link } = (req.body ?? {}) as { action?: string; email?: string; link?: string };
  const target = email?.trim();

  if (action === 'autofill') return res.status(200).json({ ok: true, email: generateEmail() });

  if (action === 'inbox') {
    if (!target) return res.status(400).json({ error: 'Missing email.' });
    return res.status(200).json(await readInbox(target));
  }

  if (action === 'send') {
    if (!target) return res.status(400).json({ error: 'Missing email.' });
    return res.status(200).json(await postForm('/send.php', { email: target }));
  }

  if (action === 'verify') {
    const l = link?.trim();
    if (!target || !l) return res.status(400).json({ error: 'Missing email or link.' });
    return res.status(200).json(await postForm('/verif.php', { email: target, link: l }));
  }

  return res.status(400).json({ error: 'Unknown action.' });
}