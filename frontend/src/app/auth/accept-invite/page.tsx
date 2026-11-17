'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import { acceptInvite } from '@/features/team/api/service';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';

function AcceptInviteForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const router = useRouter();
  const { setUserFromApi } = useAuth();
  const t = useTranslations('team');
  const tAuth = useTranslations('auth');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <p className='text-sm text-destructive'>{t('missingInviteOpenEmail')}</p>
    );
  }

  return (
    <form
      className='space-y-4'
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          setBusy(true);
          try {
            const tokens = await acceptInvite({ token, fullName, password });
            setUserFromApi(tokens.user);
            toast.success(t('welcomeToTeam'));
            router.replace('/dashboard');
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : t('couldNotAcceptInvite')
            );
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <div className='space-y-1.5'>
        <Label htmlFor='full-name'>{t('yourName')}</Label>
        <Input
          id='full-name'
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='password'>{t('choosePassword')}</Label>
        <PasswordInput
          id='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <Button type='submit' className='w-full' disabled={busy}>
        {busy ? t('joining') : t('joinOrganization')}
      </Button>
      <p className='text-muted-foreground text-center text-xs'>
        {tAuth('alreadyHaveAccount')}{' '}
        <Link href='/auth/sign-in' className='underline'>
          {tAuth('signIn')}
        </Link>
      </p>
    </form>
  );
}

function AcceptInviteFallback() {
  const t = useTranslations('common');
  return <p className='text-sm'>{t('loading')}</p>;
}

export default function AcceptInvitePage() {
  const t = useTranslations('team');

  return (
    <AuthShell>
      <div className='space-y-6'>
        <div className='space-y-1'>
          <h1 className='font-display text-2xl font-extrabold tracking-tight'>
            {t('acceptInviteHeading')}
          </h1>
          <p className='text-muted-foreground text-sm'>{t('acceptInviteBody')}</p>
        </div>
        <Suspense fallback={<AcceptInviteFallback />}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
