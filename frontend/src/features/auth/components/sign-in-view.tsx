'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { AuthDivider, GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { SurvaiLoadingInline } from '@/components/hippie-loading-screen';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type PasswordValues = {
  email: string;
  password: string;
};

export default function SignInViewPage() {
  const { login, isSignedIn, isLoading, user } = useAuth();
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [serverError, setServerError] = useState<string | null>(null);
  const redirectedRef = useRef(false);
  const passwordSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('emailRequired')).email(t('emailInvalid')),
        password: z.string().min(1, t('passwordRequired')).min(8, t('passwordMin'))
      }),
    [t]
  );

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  const { isSubmitting } = form.formState;

  const goHome = useCallback(
    (role?: string | null) => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      const dest =
        (role ?? user?.role) === 'system_admin' ? '/admin/overview' : '/dashboard/overview';
      startTransition(() => {
        router.replace(dest);
      });
    },
    [router, user?.role]
  );

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      goHome(user?.role);
    }
  }, [goHome, isLoading, isSignedIn, user?.role]);

  async function onSubmit(values: PasswordValues) {
    setServerError(null);
    try {
      const pair = await login(values.email.trim(), values.password);
      toast.success(t('welcomeBack'), {
        description: t('signedInSuccess')
      });
      goHome(pair.user.role);
    } catch (err) {
      redirectedRef.current = false;
      const message = err instanceof Error ? err.message : t('signInFailed');
      setServerError(message);
    }
  }

  if (isLoading || isSignedIn) {
    return (
      <AuthShell>
        <SurvaiLoadingInline
          className='auth-status'
          message={isSignedIn ? tCommon('loading') : t('checkingSession')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className='auth-head'>
        <h1 className='auth-title'>{t('signInTitle')}</h1>
        <p className='auth-subtitle'>{t('signInSubtitle')}</p>
      </div>

      <div className='auth-stack'>
        {serverError ? (
          <div role='alert' className='auth-alert'>
            {serverError}
          </div>
        ) : null}

        <GoogleSignInButton
          mode='signin'
          onError={(message) => setServerError(message)}
          onSuccess={() => {
            toast.success(t('welcomeBack'), {
              description: t('signedInGoogle')
            });
            goHome();
          }}
        />
        <AuthDivider />

        <form
          className='auth-fields'
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          noValidate
        >
          <div className='auth-field'>
            <label htmlFor='sign-in-email' className='auth-label'>
              {t('email')}
            </label>
            <input
              id='sign-in-email'
              type='email'
              placeholder={t('emailPlaceholder')}
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              disabled={isSubmitting}
              aria-invalid={!!form.formState.errors.email}
              className={cn('auth-input', form.formState.errors.email && 'is-invalid')}
              {...form.register('email', {
                onChange: () => {
                  if (serverError) setServerError(null);
                }
              })}
            />
            {form.formState.errors.email ? (
              <p className='auth-error-text'>{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className='auth-field'>
            <div className='auth-label-row'>
              <label htmlFor='sign-in-password' className='auth-label'>
                {t('password')}
              </label>
              <Link href='/auth/forgot-password' className='auth-link'>
                {t('forgotPassword')}
              </Link>
            </div>
            <PasswordInput
              id='sign-in-password'
              placeholder={t('passwordPlaceholder')}
              autoComplete='current-password'
              disabled={isSubmitting}
              aria-invalid={!!form.formState.errors.password}
              className={cn(form.formState.errors.password && 'is-invalid')}
              {...form.register('password', {
                onChange: () => {
                  if (serverError) setServerError(null);
                }
              })}
            />
            {form.formState.errors.password ? (
              <p className='auth-error-text'>{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <button type='submit' disabled={isSubmitting} className='auth-btn'>
            {isSubmitting ? (
              <>
                <Icons.spinner className='size-4 animate-spin' />
                {t('signingIn')}
              </>
            ) : (
              t('signIn')
            )}
          </button>
        </form>

        <p className='auth-foot-note'>
          {t('newOrganization')}{' '}
          <Link href='/auth/sign-up' className='auth-link'>
            {t('createWorkspace')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
