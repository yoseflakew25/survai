'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, startTransition } from 'react';

import { useAuth } from '@/lib/auth-context';
import { HippieLoadingScreen } from '@/components/hippie-loading-screen';
import { RequireAuth } from '@/components/layout/require-auth';

function SystemAdminGate({ children }: { children: React.ReactNode }) {
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
    return <HippieLoadingScreen message='Checking admin access' />;
  }

  if (user.role !== 'system_admin') {
    return <HippieLoadingScreen message='Redirecting' />;
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
