'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();
  const t = useTranslations('common');

  return (
    <div className='flex min-h-svh items-center justify-center px-4'>
      <div className='w-full max-w-md border border-foreground/15 bg-background p-8 text-center'>
        <p className='font-mono text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
          404
        </p>
        <p className='mt-4 text-[clamp(3rem,12vw,4.5rem)] font-semibold leading-[0.85] tracking-[-0.06em] lowercase'>
          surv<span className='text-[var(--survai-mint-strong,#0f9f5c)]'>ai</span>
        </p>
        <h1 className='mt-6 font-display text-xl font-semibold tracking-[-0.03em]'>{t('notFoundTitle')}</h1>
        <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>{t('notFoundBody')}</p>
        <div className='mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center'>
          <Button onClick={() => router.back()} variant='default' size='lg' className='w-full sm:w-auto'>
            {t('goBack')}
          </Button>
          <Button
            render={<Link href='/' />}
            nativeButton={false}
            variant='outline'
            size='lg'
            className='w-full sm:w-auto'
          >
            {t('backToHome')}
          </Button>
        </div>
      </div>
    </div>
  );
}