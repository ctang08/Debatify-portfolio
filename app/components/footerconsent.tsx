'use client';

export default function Footer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 text-[10px] text-gray-500 defaulttext px-3 py-2 rounded-lg bg-white shadow-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white max-w-sm leading-snug ${className}`}
    >
      © 2025 Debatify. By using this site, you agree to our{' '}
      <a href="/terms" className="underline hover:text-gray-700">Terms</a> and{' '}
      <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>.
    </div>
  );
}
