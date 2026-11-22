'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, startTransition } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/lib/auth-context';
import { SurvaiLoadingScreen } from '@/components/hippie-loading-screen';
import { RequireAuth } from '@/components/layout/require-auth';

function SystemAdminGate({ children }: { children: React.ReactNode }) {
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const redirectAway = useEffectEvent(() => {
    startTransition(() => {
      router.replace('/dashboard/overview');
    });
  });

  useEffect(() => {
    if (isLoading || !user) return;
    const ok = user.role === 'system_admin';
    if (!ok) redirectAway();
  }, [isLoading, user]);

  if (isLoading || !user) {
    return <SurvaiLoadingScreen message={tAuth('checkingAdminAccess')} />;
  }

  if (user.role !== 'system_admin') {
    return <SurvaiLoadingScreen message={tCommon('redirecting')} />;
  }

  return <>{children}</>;
}

export function RequireSystemAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <SystemAdminGate>{children}</SystemAdminGate>
    </RequireAuth>
  );
}
