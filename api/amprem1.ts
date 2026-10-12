import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxy ke Server 1 (ampremnyxie.vercel.app). Upstream terima JSON:
//   send   → { email }
//   verify → { email, link }
// Kunci/token tidak pernah menyentuh browser.

export const config = { maxDuration: 60 };

const BASE_URL = 'https://ampremnyxie.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { action, email, link } = (req.body ?? {}) as { action?: string; email?: string; link?: string };
  const target = email?.trim();
  if (!action || !target) return res.status(400).json({ error: 'Missing action or email.' });

  const path = action === 'send' ? '/api/send' : action === 'verify' ? '/api/verify' : null;
  if (!path) return res.status(400).json({ error: 'Unknown action.' });

  const body: Record<string, string> = { email: target };
  if (action === 'verify') {
    const l = link?.trim();
    if (!l) return res.status(400).json({ error: 'Missing link.' });
    body.link = l;
  }

  try {
    const upstream = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : 'Upstream unreachable.' });
  }
}