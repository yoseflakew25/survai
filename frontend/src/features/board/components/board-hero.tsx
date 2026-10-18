'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { IconChevronRight } from '@/features/board/components/launchpot-mark';

function IconSpark({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      className={className}
      aria-hidden='true'
    >
      <path
        d='M12 3V6M12 18V21M3 12H6M18 12H21M5.64 5.64L7.76 7.76M16.24 16.24L18.36 18.36M5.64 18.36L7.76 16.24M16.24 7.76L18.36 5.64'
        stroke='currentColor'
        strokeLinecap='round'
        strokeWidth='1.5'
      />
      <circle cx='12' cy='12' r='3.25' stroke='currentColor' strokeWidth='1.5' />
    </svg>
  );
}

export function BoardHero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push('/dashboard/overview');
  }

  return (
    <section className='relative pt-2 pb-8 text-center sm:pt-6'>
      <div className='dot-grid absolute inset-x-0 -top-10 -z-10 h-72' aria-hidden='true' />

      <div className='inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3 font-mono text-xs text-muted-foreground'>
        <span className='live-dot' />
        <b className='font-medium text-foreground'>Plan → Report</b>
        AI that never invents stats
        <span className='hidden sm:inline'>· M&amp;E ready</span>
      </div>

      <h1 className='font-display mt-5 text-[2.4rem] leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-[3.4rem]'>
        Surveys with numbers
        <br className='hidden sm:block' /> you can <span className='hl'>trust</span>.
      </h1>

      <p className='mx-auto mt-4 max-w-[30rem] text-[15px] leading-relaxed text-muted-foreground'>
        Survai helps you plan, build, review, collect, analyze, and report — AI writes the
        language, deterministic code owns every figure.
      </p>

      <form
        onSubmit={onSubmit}
        className='mx-auto mt-7 flex max-w-lg items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-md transition-colors focus-within:border-foreground/40'
      >
        <IconSpark className='ml-2.5 h-4 w-4 shrink-0 text-muted-foreground' />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='What do you want to learn from respondents?'
          aria-label='Survey topic or research question'
          className='h-10 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground/70 focus:outline-none'
        />
        <button type='submit' className='btn-back h-10 shrink-0 px-4 text-sm'>
          Plan it <IconChevronRight className='h-4 w-4' />
        </button>
      </form>

      <p className='mt-2.5 font-mono text-xs text-muted-foreground'>
        0% numerical hallucination · grounded analytics only
      </p>

      <Link
        href='/dashboard/overview'
        className='mt-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
      >
        Already working on a survey? Open the dashboard
        <IconChevronRight className='h-3.5 w-3.5' />
      </Link>
    </section>
  );
}
