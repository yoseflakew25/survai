'use client';

import { useTranslations } from 'next-intl';

import { Icons } from '@/components/icons';
import { ChangePasswordPanel } from '@/features/profile/components/change-password-panel';
import { useAuth } from '@/lib/auth-context';

export default function SecurityViewPage() {
  const tAccount = useTranslations('account');
  const tNav = useTranslations('nav');
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div
        className='flex flex-1 items-center justify-center py-16'
        role='status'
        aria-live='polite'
        aria-busy='true'
      >
        <Icons.spinner className='size-5 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-8 md:px-6 md:pt-4'>
      <header className='mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4'>
        <div>
          <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
            {tNav('security')}
          </h1>
          <p className='mt-0.5 text-sm text-muted-foreground'>
            {tAccount('securityPageSubtitle', { email: user.email })}
          </p>
        </div>
        <span className='inline-flex items-center gap-1.5 rounded-none border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs font-medium text-foreground'>
          <Icons.lock className='size-3 text-muted-foreground' />
          {user.email}
        </span>
      </header>

      <ChangePasswordPanel subtitle={tAccount('keepSeatSecure')} />
    </div>
  );
}
