// app/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';

/* ───────────────────────── Typewriter ───────────────────────── */
// returns [typedText, done]
function useTypewriter(fullText: string, speedMs = 42): [string, boolean] {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let t: number | null = null;
    setText('');
    setDone(false);

    const step = () => {
      i += 1;
      setText(fullText.slice(0, i));
      if (i < fullText.length) {
        t = window.setTimeout(step, speedMs);
      } else {
        setDone(true);
      }
    };

    t = window.setTimeout(step, speedMs);
    return () => { if (t) clearTimeout(t); };
  }, [fullText, speedMs]);

  return [text, done];
}

type Options = {
  typeMs?: number;   // per-char typing delay
  deleteMs?: number; // per-char deleting delay
  holdMs?: number;   // pause after fully typed
  gapMs?: number;    // pause after deletion, before next phrase
  loop?: boolean;    // repeat forever
};

function useTypeDeleteCycle(
  items: string[],
  {
    typeMs = 40,
    deleteMs = 22,
    holdMs = 900,
    gapMs = 240,
    loop = true,
  }: Options = {}
) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting' | 'gap'>('typing');
  const indexRef = useRef(0); // which item
  const charRef = useRef(0);  // how many chars of current item shown
  const timerRef = useRef<number | null>(null);

  // Reset when list changes
  useEffect(() => {
    setText('');
    setPhase('typing');
    indexRef.current = 0;
    charRef.current = 0;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.join('||')]); // join to detect changes in content order

  useEffect(() => {
    if (!items.length) return;

    const current = items[indexRef.current] ?? '';
    const clear = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };

    switch (phase) {
      case 'typing': {
        if (charRef.current < current.length) {
          timerRef.current = window.setTimeout(() => {
            charRef.current += 1;
            setText(current.slice(0, charRef.current));
          }, typeMs);
        } else {
          timerRef.current = window.setTimeout(() => setPhase('holding'), holdMs);
        }
        break;
      }
      case 'holding': {
        timerRef.current = window.setTimeout(() => setPhase('deleting'), holdMs);
        break;
      }
      case 'deleting': {
        if (charRef.current > 0) {
          timerRef.current = window.setTimeout(() => {
            charRef.current -= 1;
            setText(current.slice(0, charRef.current));
          }, deleteMs);
        } else {
          // move to next index
          const nextIndex = indexRef.current + 1;
          if (nextIndex < items.length) {
            indexRef.current = nextIndex;
            setPhase('gap');
          } else if (loop) {
            indexRef.current = 0;
            setPhase('gap');
          } else {
            // stop on last one if not looping
            clear();
          }
        }
        break;
      }
      case 'gap': {
        timerRef.current = window.setTimeout(() => {
          charRef.current = 0;
          setPhase('typing');
        }, gapMs);
        break;
      }
    }

    return () => clear();
  }, [phase, items, typeMs, deleteMs, holdMs, gapMs, loop]);

  // Advance phase when text changes during typing/deleting
  useEffect(() => {
    if (!items.length) return;
    const current = items[indexRef.current] ?? '';
    if (phase === 'typing' && text.length === current.length) {
      setPhase('holding');
    } else if (phase === 'deleting' && text.length === 0) {
      setPhase('gap');
    }
  }, [text, items, phase]);

  return text;
}

/* ─────────────────────── Image Roller (fade) ─────────────────────── */
function ImageRoller({
  images,
  intervalMs = 2600,
  fadeMs = 500,
  aspect = 16 / 10,
}: {
  images: string[];
  intervalMs?: number;
  fadeMs?: number;
  aspect?: number; // width / height
}) {
  const [idx, setIdx] = useState(0);
  const list = useMemo(() => images?.filter(Boolean) ?? [], [images]);
  useEffect(() => {
    if (!list.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), intervalMs);
    return () => clearInterval(t);
  }, [list.length, intervalMs]);

  // reserve height using paddingTop so fill images render
  const padPct = 100 / aspect;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
      {/* soft glow */}
      <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 blur-2xl" />
      {/* height reservation */}
      <div className="w-full" style={{ paddingTop: `${padPct}%` }} />
      {/* cross-fade stack */}
      <div className="absolute inset-0 [mask-image:radial-gradient(black,transparent_130%)]">
        {list.length ? (
          list.map((src, i) => (
            <div
              key={src + i}
              className="absolute inset-0 will-change-opacity"
              style={{ opacity: i === idx ? 1 : 0, transition: `opacity ${fadeMs}ms linear` }}
              aria-hidden={i !== idx}
            >
              <Image
                src={src}
                alt={`Preview ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width:1024px) 42vw, 90vw"
                className="object-cover md:object-contain select-none"
                draggable={false}
              />
            </div>
          ))
        ) : (
          // graceful fallback if you haven’t added images yet
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-400 dark:border-zinc-600 border-t-transparent" />
          </div>
        )}
      </div>

      {/* dotted overlay for texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.09] bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] text-zinc-800 dark:text-white"
      />
    </div>
  );
}

/* ───────────────────────── Background FX ───────────────────────── */
function Background() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* animated gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_10%_-10%,theme(colors.indigo.300/35),transparent),radial-gradient(900px_500px_at_110%_10%,theme(colors.fuchsia.300/28),transparent),radial-gradient(900px_600px_at_50%_110%,theme(colors.cyan.300/30),transparent)] dark:bg-[radial-gradient(1000px_600px_at_10%_-10%,theme(colors.indigo.500/20),transparent),radial-gradient(900px_500px_at_110%_10%,theme(colors.fuchsia.500/18),transparent),radial-gradient(900px_600px_at_50%_110%,theme(colors.cyan.500/20),transparent)] animate-slow-pan" />
      {/* soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,transparent,rgba(0,0,0,0.06))] dark:bg-[radial-gradient(60%_60%_at_50%_40%,transparent,rgba(0,0,0,0.35))]" />
    </div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */
export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data?.user)); }, [supabase]);

  // Title typing
  const [titleText, titleDone] = useTypewriter('welcome to debatify.');

  // Subtitle sequence starts AFTER title finishes
const subtitle = useTypeDeleteCycle(
  titleDone ? ['research faster.', 'prep smarter.', 'debate better.'] : [],
  { typeMs: 36, deleteMs: 22, holdMs: 950, gapMs: 240, loop: true }
);

  const images = [
    '/contentions.png',
    '/blockfile.png',
    '/rhetorify.png',
    '/search.png',
    '/extendify.png',
    '/AI.png',
  ];

  return (
    <div className="relative min-h-[100svh] w-full flex flex-col items-center justify-center px-4">
      <Background />

      {/* Title */}
      <div className="text-center -mt-[6vh] md:-mt-[10vh] space-y-4">
        <h1 className="defaulttext text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight drop-shadow-sm">
          {titleText}
          <span className="ml-1 inline-block h-[0.9em] w-[2px] align-[-0.1em] bg-current animate-cursor" />
        </h1>

        {/* Subtitle that types, deletes, and finishes on the last phrase */}
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-700/85 dark:text-zinc-300/90 min-h-[1.6em]">
          {subtitle}
          {titleDone && subtitle !== 'debate better.' && (
            <span className="ml-1 inline-block h-[0.9em] w-[2px] align-[-0.1em] bg-current animate-cursor" />
          )}
        </p>

        <div className="mx-auto h-1 w-40 sm:w-56 rounded-full bg-zinc-900/80 dark:bg-white/90" />
      </div>

      {/* Content Row */}
      <div className="mt-10 grid w-full max-w-6xl gap-8 md:grid-cols-2 items-start">
        {/* Preview card with gentle float */}
        <div className="md:order-1 order-2 animate-float">
          <ImageRoller images={images} />
          <div className="mt-3 text-center text-xs text-zinc-600 dark:text-zinc-400" />
        </div>

        {/* CTAs */}
        <div className="md:order-2 order-1 flex flex-col items-center justify-center sm:mt-30">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {isAuthed ? (
              <Link href="/main" className="submitbutton w-full sm:w-48 hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.35)]">
                <span>get searching</span>
                <ArrowRightIcon className="w-5 md:w-6" />
              </Link>
            ) : (
              <>
                <Link href="/account/login" className="submitbutton w-full sm:w-48 hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.35)]">
                  <span>login/signup</span>
                  <ArrowRightIcon className="w-5 md:w-6" />
                </Link>
                <Link href="/main" className="submitbutton w-full sm:w-48 hover:shadow-[0_12px_40px_-12px_rgba(16,185,129,0.35)]">
                  <span>use as guest</span>
                  <ArrowRightIcon className="w-5 md:w-6" />
                </Link>
              </>
            )}
          </div>

          {/* feature chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            {['search engine', 'extract rhetoric', 'blockfile', 'new evidence'].map((t, i) => (
              <span
                key={t}
                className={`px-2.5 py-1 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur ring-1 ring-black/5 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-200 ${
                  i >= 3 ? 'hidden sm:inline-flex' : ''
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style jsx global>{`
        @keyframes cursor { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .animate-cursor { animation: cursor 1.05s step-end infinite; }

        @keyframes float {
          0% { transform: translateY(0) }
          50% { transform: translateY(-6px) }
          100% { transform: translateY(0) }
        }
        .animate-float { animation: float 5.5s ease-in-out infinite; }

        @keyframes slow-pan {
          0% { transform: translate3d(0,0,0) scale(1) }
          50% { transform: translate3d(-2%, -1%, 0) scale(1.02) }
          100% { transform: translate3d(0,0,0) scale(1) }
        }
        .animate-slow-pan { animation: slow-pan 22s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
