import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless function: POST /api/chat
// The API key lives ONLY here (environment variable on Vercel), never in the browser code.

export const config = { maxDuration: 60 };

const BASE_URL = (process.env.XTROUTER_BASE_URL || 'https://api.xkiro.com/v1').replace(/\/+$/, '');
const MODEL = process.env.XTROUTER_MODEL || 'claude-opus-4.8';

const MAX_MESSAGES = 12;
const MAX_CHARS = 4000;
const MAX_TOKENS = 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;

const SYSTEM_PROMPT =
  "You are the assistant on Idzam's website. Reply in the same language the user writes in. Be friendly, clear and concise.";

// Best-effort per-account rate limit (resets when the serverless instance restarts).
const hits = new Map<string, number[]>();

function withinLimit(uid: string): boolean {
  const now = Date.now();
  const recent = (hits.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(uid, recent);
    return false;
  }
  recent.push(now);
  hits.set(uid, recent);
  return true;
}

// Only signed-in users may chat, so strangers cannot burn through the API key.
async function verifyFirebaseToken(idToken: string, apiKey: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.SITE_URL) headers.Referer = process.env.SITE_URL;
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      { method: 'POST', headers, body: JSON.stringify({ idToken }) }
    );
    if (!r.ok) return null;
    const data = (await r.json()) as { users?: { localId?: string }[] };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function cleanMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const out: ChatMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (text) out.push({ role, content: text });
  }
  if (out.length === 0 || out[out.length - 1].role !== 'user') return null;
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.XTROUTER_API_KEY;
  const firebaseKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const missing: string[] = [];
  if (!apiKey) missing.push('XTROUTER_API_KEY');
  if (!firebaseKey) missing.push('FIREBASE_API_KEY (or VITE_FIREBASE_API_KEY)');
  if (missing.length > 0) {
    return res.status(503).json({ error: `Chat is not configured yet: the server is missing ${missing.join(' and ')}.` });
  }

  const header = req.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const uid = token ? await verifyFirebaseToken(token, firebaseKey) : null;
  if (!uid) return res.status(401).json({ error: 'Please sign in again.' });

  if (!withinLimit(uid)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a few minutes.' });
  }

  const body = req.body as { messages?: unknown } | undefined;
  const messages = cleanMessages(body?.messages);
  if (!messages) return res.status(400).json({ error: 'Invalid message.' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      console.error('AI upstream error', upstream.status);
      return res.status(502).json({ error: 'The AI service returned an error. Try again in a moment.' });
    }

    const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: 'The AI service sent an empty reply.' });
    return res.status(200).json({ reply });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return res.status(504).json({ error: aborted ? 'The AI took too long to answer.' : 'Could not reach the AI service.' });
  } finally {
    clearTimeout(timer);
  }
}
