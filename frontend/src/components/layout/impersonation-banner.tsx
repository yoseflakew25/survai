'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { stopImpersonation } from '@/features/admin/api/service';
import { useAuth } from '@/lib/auth-context';
import { setApiAccessToken, setApiRefreshToken } from '@/lib/api';
import { toast } from '@/lib/toast';

export function ImpersonationBanner() {
  const { user, setUserFromApi, isImpersonating } = useAuth();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  if (!isImpersonating) return null;

  async function exit() {
    setBusy(true);
    try {
      const pair = await stopImpersonation();
      setApiAccessToken(pair.access_token);
      setApiRefreshToken(pair.refresh_token);
      setUserFromApi(pair.user as never);
      startTransition(() => {
        router.replace('/admin/orgs');
      });
      toast.success('Impersonation ended');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not end impersonation'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-amber-600/30 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50'>
      <p className='min-w-0 truncate'>
        Impersonating{' '}
        <strong>{user?.organizationName || user?.fullName || 'org'}</strong>
        {' — '}actions run as their org owner.
      </p>
      <button
        type='button'
        disabled={busy || pending}
        onClick={() => void exit()}
        className='shrink-0 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-800 disabled:opacity-60'
      >
        {busy ? 'Exiting…' : 'Exit impersonation'}
      </button>
    </div>
  );
}
