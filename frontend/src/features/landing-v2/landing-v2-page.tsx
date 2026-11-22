'use client';

import { useRef, useState } from 'react';

import { LandingV2Content } from '@/features/landing-v2/landing-v2-content';
import { useLandingV2Effects } from '@/features/landing-v2/use-landing-v2-effects';
import '@/features/landing-v2/landing-v2.css';

export function LandingV2Page() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useLandingV2Effects(rootRef, {
    menuOpen,
    setMenuOpen
  });

  return (
    <div ref={rootRef} className='landing-v2-root js' suppressHydrationWarning>
      <LandingV2Content
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
        onMenuClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
