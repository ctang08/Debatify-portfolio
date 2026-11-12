'use client';

import { type ReactNode } from 'react';

function Background() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* gradient wash (no animation here) */}
      <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_10%_-10%,theme(colors.indigo.300/35),transparent),radial-gradient(900px_500px_at_110%_10%,theme(colors.fuchsia.300/28),transparent),radial-gradient(900px_600px_at_50%_110%,theme(colors.cyan.300/30),transparent)] dark:bg-[radial-gradient(1000px_600px_at_10%_-10%,theme(colors.indigo.500/20),transparent),radial-gradient(900px_500px_at_110%_10%,theme(colors.fuchsia.500/18),transparent),radial-gradient(900px_600px_at_50%_110%,theme(colors.cyan.500/20),transparent)]" />
      {/* soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,transparent,rgba(0,0,0,0.06))] dark:bg-[radial-gradient(60%_60%_at_50%_40%,transparent,rgba(0,0,0,0.35))]" />
    </div>
  );
}

export default function OfficeHoursLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // cancel parent p-4 and kill tiny horizontal overflow
    <div className="overflow-x-hidden">
      <div className="relative min-h-[100svh] w-full">
        <Background />

        {/* main content stays in the main column, not over sidebar */}
        <div className="relative flex min-h-[100svh] items-center justify-center px-4">
          {children}
        </div>
        <div className="pointer-events-none absolute bottom-4 right-6 font-bold text-[11px] lg:text-xl hidden sm:block text-black dark:text-white">
          <span className="opacity-80">powered by </span>
          <a
            href="https://www.debaterhub.com/"
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto underline-offset-2 underline"
          >
            DebaterHub
          </a>
        </div>
      </div>
    </div>
  );
}
