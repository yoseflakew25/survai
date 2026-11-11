'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, startTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { HippieLoadingScreen } from '@/components/hippie-loading-screen';
import { overviewQueryOptions } from '@/features/overview/api/queries';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const redirectToSignIn = useEffectEvent(() => {
    startTransition(() => {
      router.replace('/auth/sign-in');
    });
  });

  useEffect(() => {
    if (!isLoading && !isLoggingOut && !isSignedIn) {
      redirectToSignIn();
    }
  }, [isLoading, isLoggingOut, isSignedIn]);

  // Warm overview as soon as the session is ready so KPIs aren't blocked on
  // chart/sidebar mount order.
  useEffect(() => {
    if (!isSignedIn || isLoading) return;
    void queryClient.prefetchQuery(overviewQueryOptions());
  }, [isSignedIn, isLoading, queryClient]);

  if (isLoggingOut) {
    return <HippieLoadingScreen message='Signing out' />;
  }

  if (isLoading) {
    return <HippieLoadingScreen message='Checking session' />;
  }

  if (!isSignedIn) {
    return <HippieLoadingScreen message='Redirecting to sign in' />;
  }

  return <>{children}</>;
}
