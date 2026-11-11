import { Metadata } from 'next';
import { Suspense } from 'react';

import ForgotPasswordViewPage from '@/features/auth/components/forgot-password-view';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { Icons } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Authentication | Forgot Password',
  description: 'Request a password reset link for your SurvAI organization account.'
};

function ForgotPasswordFallback() {
  return (
    <AuthShell>
      <div
        className='flex flex-col items-center justify-center gap-3 py-16'
        role='status'
        aria-live='polite'
        aria-busy='true'
      >
        <Icons.spinner className='text-muted-foreground size-5 animate-spin' />
        <p className='text-muted-foreground text-sm'>Loading…</p>
      </div>
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordViewPage />
    </Suspense>
  );
}
