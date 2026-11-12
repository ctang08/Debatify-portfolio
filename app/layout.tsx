import { manrope } from '@/app/ui/fonts';
import './globals.css';
import ClientWrapper from '@/app/client-wrapper';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'Debatify',
    template: '%s | Debatify',
  },
  description: 'Cut cards, search evidence, and prep faster with Debatify.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Debatify',
    description: 'Search and organize debate evidence with AI.',
    url: 'https://www.debatify.app',
    siteName: 'Debatify',
    type: 'website',
    images: [
      {
        url: '/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Debatify Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Debatify',
    description: 'Search and organize debate evidence with AI.',
    images: ['/android-chrome-512x512.png'],
  },
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${manrope.className} antialiased bg-gray-50 dark:bg-gray-900`}>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
