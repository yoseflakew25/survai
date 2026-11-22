'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { SurvaiLoadingInline } from '@/components/hippie-loading-screen';
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
    return <p className='auth-error-text'>{t('missingInviteOpenEmail')}</p>;
  }

  return (
    <form
      className='auth-fields'
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
            toast.error(err instanceof Error ? err.message : t('couldNotAcceptInvite'));
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <div className='auth-field'>
        <label htmlFor='full-name' className='auth-label'>
          {t('yourName')}
        </label>
        <input
          id='full-name'
          className='auth-input'
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className='auth-field'>
        <label htmlFor='password' className='auth-label'>
          {t('choosePassword')}
        </label>
        <PasswordInput
          id='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <button type='submit' className='auth-btn' disabled={busy}>
        {busy ? t('joining') : t('joinOrganization')}
      </button>
      <p className='auth-foot-note'>
        {tAuth('alreadyHaveAccount')}{' '}
        <Link href='/auth/sign-in' className='auth-link'>
          {tAuth('signIn')}
        </Link>
      </p>
    </form>
  );
}

function AcceptInviteFallback() {
  const t = useTranslations('common');
  return <SurvaiLoadingInline className='auth-status' message={t('loading')} />;
}

export default function AcceptInvitePage() {
  const t = useTranslations('team');

  return (
    <AuthShell>
      <div className='auth-head'>
        <h1 className='auth-title'>{t('acceptInviteHeading')}</h1>
        <p className='auth-subtitle'>{t('acceptInviteBody')}</p>
      </div>
      <Suspense fallback={<AcceptInviteFallback />}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}
