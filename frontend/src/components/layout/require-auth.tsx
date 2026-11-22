'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, startTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/lib/auth-context';
import { SurvaiLoadingScreen } from '@/components/hippie-loading-screen';
import { overviewQueryOptions } from '@/features/overview/api/queries';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const tNav = useTranslations('nav');
  const tAuth = useTranslations('auth');
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
    return <SurvaiLoadingScreen message={tNav('signingOut')} />;
  }

  if (isLoading) {
    return <SurvaiLoadingScreen message={tAuth('checkingSession')} />;
  }

  if (!isSignedIn) {
    return <SurvaiLoadingScreen message={tAuth('redirectingSignIn')} />;
  }

  return <>{children}</>;
}
