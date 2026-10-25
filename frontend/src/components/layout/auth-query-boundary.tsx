'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';

/**
 * Renders children only after client mount + auth session is ready.
 *
 * Dashboard pages must not run cookie-auth API queries during SSR / before
 * RequireAuth finishes — the server has no browser cookies, which surfaces as
 * "Could not validate credentials".
 */
export function AuthQueryBoundary({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isSignedIn, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading || !isSignedIn) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
