import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateContent, extensionPrompt } from '@/app/api/ai';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';


const model = process.env.EXTENDIFYMODEL;


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


async function loadGoogleCredentials() {
 const base64 = process.env.GOOGLECREDENTIALS;
 if (!base64) throw new Error('Missing GOOGLECREDENTIALS');
 const decoded = Buffer.from(base64, 'base64').toString('utf8');
 const tmpPath = path.join('/tmp', 'google-credentials.json');
 await fs.writeFile(tmpPath, decoded);
 process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
}


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
   await loadGoogleCredentials();


   const { input } = await req.json();


   if (!input || typeof input !== 'string') {
     return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
   }


   const prompt = await extensionPrompt(input);
   const result = await generateContent(prompt, model);


   return NextResponse.json({ result });
 } catch (error) {
   console.error('Model Error:', error);
   return NextResponse.json({ message: error?.message || 'Internal server error.' }, { status: 500 });
 }
}