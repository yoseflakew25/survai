import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';

import { cn } from '@/lib/utils';

/** Loaded faces — keep names distinct from theme tokens so themes can reference them. */
const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono'
});

const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['600', '700', '800']
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontDisplay.variable
);
