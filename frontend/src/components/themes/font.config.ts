import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';

import { cn } from '@/lib/utils';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
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
