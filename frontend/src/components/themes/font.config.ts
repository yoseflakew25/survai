import {
  Bricolage_Grotesque,
  Geist,
  Geist_Mono,
  Noto_Sans_Ethiopic
} from 'next/font/google';

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

/** Fidel / Amharic glyphs — stacked after Geist via CSS font-family. */
const fontEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  variable: '--font-noto-ethiopic',
  weight: ['400', '500', '600', '700']
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontDisplay.variable,
  fontEthiopic.variable
);
