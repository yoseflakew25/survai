'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, startTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { HippieLoadingScreen } from '@/components/hippie-loading-screen';
import { overviewQueryOptions } from '@/features/overview/api/queries';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  // Warm org overview for dashboard routes only — admin has its own API and
  // this prefetch was burning a second ~15s Aiven round-trip on /admin/*.
  useEffect(() => {
    if (!isSignedIn || isLoading) return;
    if (pathname?.startsWith('/admin')) return;
    void queryClient.prefetchQuery(overviewQueryOptions());
  }, [isSignedIn, isLoading, pathname, queryClient]);

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
