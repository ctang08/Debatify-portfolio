'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';

/* ───────────── Typewriter ───────────── */
function useTypewriter(fullText: string, speedMs = 45): [string, boolean] {
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

    return () => {
      if (t !== null) clearTimeout(t);
    };
  }, [fullText, speedMs]);

  return [text, done];
}

/* ───────────── Page ───────────── */

export default function OfficeHoursPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [title, titleDone] = useTypewriter('welcome to office hours', 52);
  const [subtitle] = useTypewriter(
    titleDone ? 'elite, personalized coaching at no cost' : '',
    32
  );

  async function handleGetStarted() {
    if (loading) return;
    setLoading(true);

    // 1. Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/account/login');
      return;
    }

    // 2. Get office-hours-info
    const { data, error } = await supabase
      .from('office_hours_info')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // If no record → onboarding
    if (!data || error) {
      router.push('/main/office-hours/onboarding');
      return;
    }

    // Required fields
    const required = ['age', 'grade', 'event', 'circuit', 'level', 'num_tourneys'];

    const incomplete = required.some((field) => {
      const v = data[field];
      return v === null || v === undefined || v === '';
    });

    if (incomplete) {
      router.push('/main/office-hours/onboarding');
    } else {
      router.push('/main/office-hours/sona');
    }
  }

  return (
    <main className="relative w-full max-w-4xl text-center">

      {/* Title */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-tight text-zinc-900 drop-shadow-[0_4px_20px_rgba(0,0,0,0.25)] dark:text-white">
        {title}
        <span className="ml-1 inline-block h-[0.9em] w-[2px] align-[-0.1em] bg-current animate-cursor" />
      </h1>

      {/* Subtitle */}
      <p className="mt-4 text-base sm:text-lg md:text-xl text-zinc-700/85 dark:text-zinc-300/90 min-h-[1.8em] drop-shadow-sm">
        {subtitle}
      </p>

      {/* Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleGetStarted}
          disabled={loading}
          className={`cursor-pointer inline-flex items-center gap-2 rounded-full bg-white/80 px-10 py-3 text-base font-medium text-zinc-900 shadow-2xl ring-1 ring-black/5 backdrop-blur transition 
            hover:-translate-y-0.5 hover:shadow-[0_25px_45px_-12px_rgba(0,0,0,0.35)] 
            dark:bg-zinc-900/70 dark:text-white 
            ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 dark:border-zinc-200 border-t-transparent" />
          ) : (
            <>
              get started
              <ArrowRightIcon className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Cursor animation */}
      <style jsx global>{`
        @keyframes cursor {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        .animate-cursor {
          animation: cursor 1.05s step-end infinite;
        }
      `}</style>
    </main>
  );
}
