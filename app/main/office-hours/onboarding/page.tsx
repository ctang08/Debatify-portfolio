// app/main/office-hours/onboarding/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';

type OfficeHoursField =
  | 'age'
  | 'grade'
  | 'event'
  | 'circuit'
  | 'level'
  | 'num_tourneys';

type StepConfig = {
  key: OfficeHoursField;
  label: string;
  type: 'select' | 'number';
  options?: string[];
  placeholder?: string;
};

const STEPS: StepConfig[] = [
  {
    key: 'age',
    label: 'age?',
    type: 'select',
    options: ['under 13', '13-15', '15-17', '18+'],
  },
  {
    key: 'grade',
    label: 'grade level?',
    type: 'select',
    options: ['7th', '8th', '9th', '10th', '11th', '12th', 'college', 'post-college', 'other'],
  },
  {
    key: 'event',
    label: 'primary event?',
    type: 'select',
    options: [
      'Public Forum',
      'Lincoln-Douglas',
      'Policy',
      'World Schools',
      'Congress',
      'Extemp',
      'Speech / Other',
    ],
  },
  {
    key: 'circuit',
    label: 'circuit level?',
    type: 'select',
    options: ['local', 'state', 'national'],
  },
  {
    key: 'level',
    label: 'experience level for your circuit?',
    type: 'select',
    options: ['beginner', 'intermediate', 'advanced'],
  },
  {
    key: 'num_tourneys',
    label: 'number of tournaments?',
    type: 'select',
    options: ['0-3', '4-8', '9+'],
  },
];

type ValuesState = Record<OfficeHoursField, string>;

const EMPTY_VALUES: ValuesState = {
  age: '',
  grade: '',
  event: '',
  circuit: '',
  level: '',
  num_tourneys: '',
};

export default function OfficeHoursOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [values, setValues] = useState<ValuesState>(EMPTY_VALUES);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUnder13, setShowUnder13] = useState(false);

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;

  // helper: map numeric age -> bucket label
  function ageToBucket(age: number | null): string {
    if (age == null) return '';
    if (age < 13) return 'under 13';
    if (age <= 15) return '13-15';
    if (age <= 17) return '15-17';
    return '18+';
  }

  // helper: bucket label -> representative numeric age
  function bucketToAge(label: string): number | null {
    const map: Record<string, number> = {
      'under 13': 12,
      '13-15': 14,
      '15-17': 16,
      '18+': 18,
    };
    return map[label] ?? null;
  }

  // helper: num tourneys numeric -> bucket label
  function tourneysToBucket(n: number | null): string {
    if (n == null) return '';
    if (n <= 3) return '0-3';
    if (n <= 8) return '4-8';
    return '9+';
  }

  // helper: bucket label -> representative numeric value
  function bucketToTourneys(label: string): number | null {
    const map: Record<string, number> = {
      '0-3': 2,
      '4-8': 6,
      '9+': 9,
    };
    return map[label] ?? null;
  }

  // Load user + existing office_hours_info
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/account/login');
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('office_hours_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setValues({
          age: ageToBucket(data.age ?? null),
          grade: data.grade ?? '',
          event: data.event ?? '',
          circuit: data.circuit ?? '',
          level: data.level ?? '',
          num_tourneys: tourneysToBucket(data.num_tourneys ?? null),
        });
      }

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(field: OfficeHoursField, val: string) {
    setValues((prev) => ({ ...prev, [field]: val }));
  }

  const currentValue = values[currentStep.key];
  const canNext = currentValue.trim() !== '';

  async function handleNext() {
    if (!userId || saving || !canNext) return;

    // Special case: under 13 – show modal and stop
    if (currentStep.key === 'age' && currentValue === 'under 13') {
      setShowUnder13(true);
      return;
    }

    setSaving(true);

    // Prepare payload for this single field
    let fieldValue: any = currentValue.trim() === '' ? null : currentValue.trim();

    if (currentStep.key === 'age') {
      fieldValue = bucketToAge(currentValue);
    } else if (currentStep.key === 'num_tourneys') {
      fieldValue = bucketToTourneys(currentValue);
    }

    const payload: Record<string, any> = {
      user_id: userId,
      [currentStep.key]: fieldValue,
    };

    const { error } = await supabase
      .from('office_hours_info')
      .upsert(payload, { onConflict: 'user_id' });

    setSaving(false);

    if (error) {
      console.error('Failed to save office hours info', error);
      return;
    }

    if (step === totalSteps - 1) {
      router.push('/main/office-hours/sona');
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (saving) return;
    if (step === 0) return;
    setStep((s) => Math.max(0, s - 1));
  }

  if (loading) {
    return (
      <main className="relative w-full max-w-4xl text-center">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700/70 border-t-transparent dark:border-zinc-200/80" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-full max-w-4xl text-center">
      {/* Question text */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-tight text-zinc-900 drop-shadow-[0_4px_20px_rgba(0,0,0,0.25)] dark:text-white">
        {currentStep.label}
      </h1>

      <p className="mt-3 text-sm sm:text-base text-zinc-700/85 dark:text-zinc-300/90">
        question {step + 1}/{totalSteps}
      </p>

      {/* Input + next button (same row) */}
<div className="mt-10 flex flex-col items-center justify-center gap-3">

  {/* Row: input + next */}
  <div className="flex flex-row items-center justify-center gap-3">

    {/* SELECT OR INPUT */}
    {currentStep.type === 'select' ? (
      <select
        value={currentValue}
        onChange={(e) => handleChange(currentStep.key, e.target.value)}
        className="cursor-pointer w-64 sm:w-72 rounded-lg border border-zinc-300/80 bg-white/80 px-4 py-2 text-sm sm:text-base text-zinc-900 shadow-[0_14px_40px_rgba(0,0,0,0.15)] outline-none backdrop-blur focus:border-zinc-900/70 focus:ring-2 focus:ring-zinc-900/40"
      >
        <option value="" disabled>
          select an option
        </option>
        {currentStep.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        type="number"
        inputMode="numeric"
        value={currentValue}
        onChange={(e) => handleChange(currentStep.key, e.target.value)}
        placeholder={currentStep.placeholder}
        className="w-64 sm:w-72 rounded-lg border border-zinc-300/80 bg-white/80 px-4 py-2 text-sm sm:text-base text-zinc-900 shadow-[0_14px_40px_rgba(0,0,0,0.15)] outline-none backdrop-blur focus:border-zinc-900/70 focus:ring-2 focus:ring-zinc-900/40"
      />
    )}

    {/* NEXT BUTTON */}
    <button
      onClick={handleNext}
      disabled={!canNext || saving}
      className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-white/90 px-5 py-2 text-sm sm:text-base font-medium text-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:bg-zinc-900/80 dark:text-white ${
        !canNext || saving ? 'opacity-70 cursor-not-allowed hover:translate-y-0' : ''
      }`}
    >
      {saving ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-800 dark:border-zinc-200 border-t-transparent" />
      ) : (
        <>
          {step === totalSteps - 1 ? 'finish' : 'next'}
          <ArrowRightIcon className="h-4 w-4" />
        </>
      )}
    </button>
  </div>

  {/* BACK LINK */}
  {step > 0 && (
    <button
      onClick={handleBack}
      className="text-xs text-zinc-700/80 dark:text-zinc-300/80 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white transition"
      disabled={saving}
    >
      back
    </button>
  )}
</div>


      {/* Under-13 modal */}
      {showUnder13 && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-md rounded-2xl bg-white/95 px-6 py-5 text-left shadow-2xl ring-1 ring-black/10 dark:bg-zinc-900/95 dark:text-white">
            <h2 className="mb-2 text-lg font-semibold">
              We&apos;re not able to set up Office Hours yet
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              At this time, Office Hours is only available for students who are at least
              13 years old.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowUnder13(false);
                  router.push('/main');
                }}
                className="cursor-pointer inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-md hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
