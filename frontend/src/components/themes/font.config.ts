import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_Ethiopic } from 'next/font/google';

import { cn } from '@/lib/utils';

/** Platform sans — paired with Plex Mono across landing / auth / app. */
const fontSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-plex-sans',
  display: 'swap'
});

/** Platform mono — labels, meta, tabular UI. */
const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap'
});

/** Fidel / Amharic glyphs — stacked after Plex via CSS font-family. */
const fontEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  variable: '--font-noto-ethiopic',
  weight: ['400', '500', '600', '700']
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontEthiopic.variable
);
