'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';
import { HippieLoadingScreen } from '@/components/hippie-loading-screen';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.replace('/auth/sign-in');
    }
  }, [isLoading, isSignedIn, router]);

  if (isLoading) {
    return <HippieLoadingScreen message='Checking session' />;
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
