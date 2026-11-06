'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy `/auth/reset-password?token=…` links are replaced by the OTP flow on
 * `/auth/forgot-password`. Keep this route as a redirect for old emails.
 */
export default function ResetPasswordViewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/forgot-password');
  }, [router]);

  return null;
}
