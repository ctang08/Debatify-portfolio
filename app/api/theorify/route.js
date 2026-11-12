import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { getTheorifyPrompt } from '@/app/api/ai';

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

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 🛡️ Abuse detection
  const abuseKey = `abuse:${ip}`;
  const abuseCount = await redis.incr(abuseKey);
  if (abuseCount === 1) await redis.expire(abuseKey, 60);
  if (abuseCount > 10) {
    return NextResponse.json(
      { message: 'Too many abusive requests. You’ve been signed out.' },
      { status: 401 }
    );
  }

  // 🚦 Rate limiting
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
          'X-RateLimit-Minute-Limit': minResult.limit.toString(),
          'X-RateLimit-Minute-Remaining': minResult.remaining.toString(),
          'X-RateLimit-Minute-Reset': minResult.reset.toString(),
          'X-RateLimit-Daily-Limit': dayResult.limit.toString(),
          'X-RateLimit-Daily-Remaining': dayResult.remaining.toString(),
          'X-RateLimit-Daily-Reset': dayResult.reset.toString(),
        },
      }
    );
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
    }

    const prompt =  await getTheorifyPrompt(input);

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`OpenAI API error: ${chatResponse.status} - ${errorText}`);
    }

    const data = await chatResponse.json();
    const result = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ message: error?.message || 'Internal server error.' }, { status: 500 });
  }
}
