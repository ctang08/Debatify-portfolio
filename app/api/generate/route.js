// app/api/generate/route.js
import { NextResponse } from 'next/server';
import { braveSearch, gptSearch, generateContent, getPrompt } from '@/app/api/ai';
import fs from 'fs/promises';
import path from 'path';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import pLimit from 'p-limit';
import { Readable } from 'node:stream';
import { load as loadHTML } from 'cheerio';

export const runtime = 'nodejs';
export const maxDuration = 60;          // hard ceiling on platform
export const dynamic = 'force-dynamic';

const model = process.env.VERTEXMODEL;

// ---------- Redis & Ratelimits ----------
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const limiterMinute = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
});

const limiterDaily = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(600, '24 h'),
  analytics: true,
});

// ---------- One-time creds loader ----------
let gcredsLoaded = false;
async function loadGoogleCredentialsOnce() {
  if (gcredsLoaded) return;
  const base64 = process.env.GOOGLECREDENTIALS;
  if (!base64) throw new Error('Missing GOOGLECREDENTIALS');
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const tmpPath = path.join('/tmp', 'google-credentials.json');
  await fs.writeFile(tmpPath, decoded);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  gcredsLoaded = true;
}

// ---------- Streamed, byte-capped HTML fetch (no char caps) ----------
const MAX_BYTES = 300_000; // ~300 KB/page

async function fetchCappedHTML(url, signal) {
  const res = await fetch(url, {
    signal,
    redirect: 'follow',
    headers: { accept: 'text/html' },
  });
  if (!res.ok || !res.body) return '';

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return '';

  const nodeStream = Readable.fromWeb(res.body);
  let n = 0;
  const chunks = [];
  for await (const ch of nodeStream) {
    const b = Buffer.isBuffer(ch) ? ch : Buffer.from(ch);
    n += b.length;
    if (n > MAX_BYTES) break;
    chunks.push(b);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// ---------- Lightweight text extraction ----------
function extractMainText(html) {
  const $ = loadHTML(html);
  $('script,style,nav,header,footer,noscript').remove();
  const text =
    $('main').text() ||
    $('article').text() ||
    $('body').text() ||
    '';
  return text.replace(/\s+/g, ' ').trim();
}

// ---------- Helpers: deadline + merged AbortSignal ----------
function mergeSignals(...signals) {
  const controller = new AbortController();
  const forward = (s) => {
    if (!s) return;
    if (s.aborted) {
      controller.abort(s.reason);
    } else {
      s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
    }
  };
  signals.forEach(forward);
  return controller;
}

// ---------- Handler ----------
export async function POST(req) {
  const t0 = Date.now();
  const deadlineMs = 55_000; // soft cap: return partial results after ~50s
  const forwarded = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ip = forwarded || 'unknown';
  console.log(`Incoming request from IP: ${ip}`);

  // Abuse detection (60s window)
  const abuseKey = `abuse:${ip}`;
  const abuseCount = await redis.incr(abuseKey);
  if (abuseCount === 1) await redis.expire(abuseKey, 60);
  console.log(`[abuse check] ${ip} => ${abuseCount} hits in 1 minute`);
  if (abuseCount > 10) {
    console.warn(`🚨 ABUSE DETECTED: ${ip} made ${abuseCount} requests in 1 minute`);
    return NextResponse.json(
      { message: 'Too many abusive requests. You’ve been signed out.' },
      { status: 401 }
    );
  }

  // Rate limiting
  const [minResult, dayResult] = await Promise.all([
    limiterMinute.limit(ip),
    limiterDaily.limit(ip),
  ]);
  if (!minResult.success || !dayResult.success) {
    return NextResponse.json(
      { message: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Minute-Limit': String(minResult.limit),
          'X-RateLimit-Minute-Remaining': String(minResult.remaining),
          'X-RateLimit-Minute-Reset': String(minResult.reset),
          'X-RateLimit-Daily-Limit': String(dayResult.limit),
          'X-RateLimit-Daily-Remaining': String(dayResult.remaining),
          'X-RateLimit-Daily-Reset': String(dayResult.reset),
        },
      }
    );
  }

  const clientSignal = req.signal;
  if (clientSignal?.aborted) {
    return NextResponse.json({ message: 'Request aborted before start' }, { status: 499 });
  }

  // Setup a 50s deadline that we can pass down to fetch/LLM
  const deadlineCtrl = new AbortController();
  const deadlineTimer = setTimeout(
    () => deadlineCtrl.abort(new Error('deadline exceeded')),
    deadlineMs
  );

  // Merge the client abort + deadline abort
  const mergedCtrl = mergeSignals(clientSignal, deadlineCtrl.signal);
  const mergedSignal = mergedCtrl.signal;

  try {
    mergedSignal.addEventListener('abort', () => {
      console.log('Abort triggered:', mergedSignal.reason || 'unknown');
    });

    await loadGoogleCredentialsOnce();

    const body = await req.json();
    const { type, entry } = body;

    // Brave paging clamps
    const rawCount = parseInt(String(body.count ?? '20'), 10);
    const rawOffset = parseInt(String(body.offset ?? '0'), 10);
    const count = Number.isFinite(rawCount) ? Math.min(Math.max(rawCount, 1), 20) : 20;
    const offset = Number.isFinite(rawOffset) ? Math.min(Math.max(rawOffset, 0), 9) : 0;

    // ---- Search (quick) ----
    const links = await braveSearch(type, entry, { count, offset });
    // const links = await gptSearch(type, entry, { count, offset })
    const typedResults = (links && links[type] && links[type].results) || [];

    // Unique http(s) URLs only
    const urls = Array.from(
      new Set(
        typedResults
          .map(r => r && r.url)
          .filter(u => typeof u === 'string' && /^https?:\/\//.test(u))
      )
    );

    // ---- Process end-to-end with limited concurrency + partial aggregation ----
    const limit = pLimit(6);
    const completed = []; // push as tasks finish

    const tasks = urls.map(url =>
      limit(async () => {
        if (mergedSignal.aborted) return null;

        const html = await fetchCappedHTML(url, mergedSignal).catch(() => '');
        if (!html) return null;

        const text = extractMainText(html);
        if (!text) return null;

        const prompt = await getPrompt(entry, url, text);

        try {
          const out = await generateContent(prompt, model, { signal: mergedSignal });
          if (out) completed.push(out);
          return out;
        } catch {
          // Fallback if SDK ignores signal
          const out = await generateContent(prompt, model).catch(() => null);
          if (out) completed.push(out);
          return out;
        }
      })
    );

    // Promise that resolves when all tasks settle
    const allDone = Promise.allSettled(tasks);

    // Promise that resolves when the deadline aborts
    const deadlineFired = new Promise(resolve => {
      deadlineCtrl.signal.addEventListener('abort', resolve, { once: true });
    });

    // Wait for either: everything done, or deadline reached
    await Promise.race([allDone, deadlineFired]);

    // Clear deadline timer and decide what to return
    clearTimeout(deadlineTimer);
    const timedOut = deadlineCtrl.signal.aborted;
    const elapsedMs = Date.now() - t0;

    // If NOT timed out, we can use the fully settled results;
    // else, return whatever has completed so far.
    let results;
    if (!timedOut) {
      const settled = await allDone;
      results = settled
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
    } else {
      // Tell any stragglers to stop (mergedSignal already aborted)
      results = completed.slice();
    }

    const nextOffset =
      (links && links[type] && links[type].nextOffset) ??
      (typedResults.length === count && offset < 9 ? offset + 1 : null);

    return NextResponse.json(
      {
        results,
        paging: { count, offset, nextOffset },
        partial: timedOut || undefined,
        elapsedMs
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          ...(timedOut ? { 'X-Partial': '1' } : {})
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', message);
    return NextResponse.json({ message }, { status: 500 });
  } finally {
    clearTimeout(deadlineTimer);
  }
}
