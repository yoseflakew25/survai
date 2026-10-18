'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, startTransition } from 'react';

import { useAuth } from '@/lib/auth-context';
import { HippieLoadingScreen } from '@/components/hippie-loading-screen';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();

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
