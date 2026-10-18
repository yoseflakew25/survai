'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { SurvaiLogo } from '@/components/survai-logo';
import {
  IconMoon,
  IconRocket,
  IconSun
} from '@/features/board/components/launchpot-mark';

const NAV = [
  { href: '#lifecycle', label: 'Lifecycle' },
  { href: '#contrast', label: 'Why Survai' },
  { href: '#demo', label: 'Try it' },
  { href: '#faq', label: 'FAQ' }
];

export function BoardHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <header className='sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md'>
      <div className='mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]'>
        <Link href='/' className='justify-self-start' aria-label='Survai home'>
          <SurvaiLogo />
        </Link>

        <nav
          aria-label='Product sections'
          className='hidden w-max items-center gap-0.5 rounded-full border border-border/60 bg-secondary p-[3px] lg:inline-flex'
        >
          {NAV.map((item) => {
            const isActive = activeHash === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={isActive ? 'true' : undefined}
                className={
                  isActive
                    ? 'h-8 rounded-full bg-card px-3.5 text-[13.5px] font-medium leading-8 whitespace-nowrap text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors'
                    : 'h-8 rounded-full px-3.5 text-[13.5px] font-medium leading-8 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground'
                }
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className='flex items-center justify-self-end gap-2'>
          <button
            type='button'
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className='relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent'
          >
            <IconSun
              className={`h-4 w-4 transition-all ${isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`}
            />
            <IconMoon
              className={`absolute h-4 w-4 transition-all ${isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`}
            />
          </button>

          <Link
            href='/dashboard/overview'
            className='inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 text-sm font-medium whitespace-nowrap text-brand-foreground transition-all hover:brightness-105'
          >
            <IconRocket className='h-4 w-4' />
            Launch
          </Link>

          <Link
            href='/auth/sign-in'
            className='inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:bg-accent'
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
