import {APP_NAME, APP_TAGLINE} from '@binary/shared';
import {GeistMono} from 'geist/font/mono';
import {GeistSans} from 'geist/font/sans';
import type {Metadata} from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
    >
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
