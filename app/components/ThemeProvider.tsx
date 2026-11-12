'use client';

import * as React from 'react';
import { ThemeProvider as NextThemes } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"   // adds 'class="dark"' to <html> when dark
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
