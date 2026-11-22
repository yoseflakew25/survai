'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { SurvaiLoadingInline } from '@/components/hippie-loading-screen';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type EmailValues = {
  email: string;
};
type ResetValues = {
  password: string;
  confirmPassword: string;
};

export default function ForgotPasswordViewPage() {
  const { requestPasswordReset, confirmPasswordReset, isSignedIn, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const emailSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('emailRequired')).email(t('emailInvalid'))
      }),
    [t]
  );
  const resetSchema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(1, t('passwordRequired'))
            .min(8, t('passwordMin'))
            .regex(/[A-Z]/, t('passwordUppercase'))
            .regex(/[0-9]/, t('passwordNumber')),
          confirmPassword: z.string().min(1, t('confirmPasswordRequired'))
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('passwordsMismatch'),
          path: ['confirmPassword']
        }),
    [t]
  );
  const deepLinkHandled = useRef(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' }
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.replace('/dashboard/overview');
    }
  }, [isLoading, isSignedIn, router]);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const email = (searchParams.get('email') || '').trim();
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    deepLinkHandled.current = true;
    emailForm.setValue('email', email);
    if (mode === 'otp') {
      setPendingEmail(email);
      setStep('otp');
    }
  }, [searchParams, emailForm]);

  async function onEmailSubmit(values: EmailValues) {
    setServerError(null);
    const email = values.email.trim();
    try {
      const result = await requestPasswordReset(email);
      setPendingEmail(email);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      setStep('otp');
      toast.success(result.dev_code ? t('devModeCodeReady') : t('checkEmail'), {
        description: result.dev_code ? t('devEmailNotConfigured') : t('resetIfRegistered')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('couldNotSendReset');
      setServerError(message);
      toast.error(t('couldNotSendResetTitle'), { description: message });
    }
  }

  async function onResetSubmit(values: ResetValues) {
    if (otp.length !== 6) {
      setServerError(t('otpIncomplete'));
      return;
    }
    setServerError(null);
    try {
      await confirmPasswordReset(pendingEmail, otp, values.password);
      setDone(true);
      toast.success(t('passwordUpdated'), {
        description: t('passwordUpdatedDesc')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('couldNotReset');
      setServerError(message);
      toast.error(t('resetFailed'), { description: message });
    }
  }

  async function onResend() {
    setServerError(null);
    setIsResending(true);
    try {
      const result = await requestPasswordReset(pendingEmail);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      toast.success(result.dev_code ? t('devCodeRefreshed') : t('codeSent'), {
        description: result.dev_code ? t('devEmailNotConfigured') : t('resendResetInbox')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('couldNotResend');
      setServerError(message);
    } finally {
      setIsResending(false);
    }
  }

  if (isLoading || isSignedIn) {
    return (
      <AuthShell>
        <SurvaiLoadingInline className='auth-status' message={t('checkingSession')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className='auth-head'>
        <h1 className='auth-title'>
          {done ? t('passwordUpdated') : step === 'otp' ? t('enterResetCode') : t('forgotTitle')}
        </h1>
        <p className='auth-subtitle'>
          {done
            ? t('passwordUpdatedHint')
            : step === 'otp'
              ? t('resetCodeHint', { email: pendingEmail })
              : t('forgotHint')}
        </p>
      </div>

      <div className='auth-stack'>
        {serverError ? (
          <div role='alert' className='auth-alert'>
            {serverError}
          </div>
        ) : null}

        {done ? (
          <Link href='/auth/sign-in' className='auth-btn'>
            {t('continueToSignIn')}
          </Link>
        ) : null}

        {!done && step === 'email' ? (
          <form className='auth-fields' onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate>
            <div className='auth-field'>
              <label htmlFor='forgot-email' className='auth-label'>
                {t('email')}
              </label>
              <input
                id='forgot-email'
                type='email'
                placeholder={t('emailPlaceholder')}
                autoComplete='email'
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck={false}
                disabled={emailForm.formState.isSubmitting}
                aria-invalid={!!emailForm.formState.errors.email}
                className={cn('auth-input', emailForm.formState.errors.email && 'is-invalid')}
                {...emailForm.register('email', {
                  onChange: () => {
                    if (serverError) setServerError(null);
                  }
                })}
              />
              {emailForm.formState.errors.email ? (
                <p className='auth-error-text'>{emailForm.formState.errors.email.message}</p>
              ) : null}
            </div>

            <button
              type='submit'
              disabled={emailForm.formState.isSubmitting}
              className='auth-btn'
            >
              {emailForm.formState.isSubmitting ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' />
                  {t('sending')}
                </>
              ) : (
                t('sendResetCode')
              )}
            </button>
          </form>
        ) : null}

        {!done && step === 'otp' ? (
          <form className='auth-fields' onSubmit={resetForm.handleSubmit(onResetSubmit)} noValidate>
            {devCode ? (
              <div className='auth-notice'>
                <p>{t('devCode')}</p>
                <p>
                  <span className='auth-mono'>{devCode}</span>
                </p>
              </div>
            ) : null}

            <div className='auth-field'>
              <p id='reset-code-label' className='auth-label'>
                {t('resetCode')}
              </p>
              <div className='auth-otp'>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  aria-label={t('resetCode')}
                  aria-labelledby='reset-code-label'
                  onChange={(value) => {
                    setOtp(value);
                    if (serverError) setServerError(null);
                  }}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className='auth-field'>
              <label htmlFor='reset-password' className='auth-label'>
                {t('newPassword')}
              </label>
              <PasswordInput
                id='reset-password'
                placeholder={t('newPasswordPlaceholder')}
                autoComplete='new-password'
                disabled={resetForm.formState.isSubmitting}
                aria-invalid={!!resetForm.formState.errors.password}
                className={cn(resetForm.formState.errors.password && 'is-invalid')}
                {...resetForm.register('password', {
                  onChange: () => {
                    if (serverError) setServerError(null);
                  }
                })}
              />
              {resetForm.formState.errors.password ? (
                <p className='auth-error-text'>{resetForm.formState.errors.password.message}</p>
              ) : null}
            </div>

            <div className='auth-field'>
              <label htmlFor='reset-confirm' className='auth-label'>
                {t('confirmPassword')}
              </label>
              <PasswordInput
                id='reset-confirm'
                placeholder={t('repeatPassword')}
                autoComplete='new-password'
                disabled={resetForm.formState.isSubmitting}
                aria-invalid={!!resetForm.formState.errors.confirmPassword}
                className={cn(resetForm.formState.errors.confirmPassword && 'is-invalid')}
                {...resetForm.register('confirmPassword')}
              />
              {resetForm.formState.errors.confirmPassword ? (
                <p className='auth-error-text'>
                  {resetForm.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <button
              type='submit'
              disabled={resetForm.formState.isSubmitting || otp.length !== 6}
              className='auth-btn'
            >
              {resetForm.formState.isSubmitting ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' />
                  {t('updating')}
                </>
              ) : (
                t('updatePassword')
              )}
            </button>

            <div className='auth-row auth-row-split'>
              <button
                type='button'
                className='auth-btn-ghost'
                disabled={isResending}
                onClick={() => void onResend()}
              >
                {isResending ? t('sending') : t('resendCode')}
              </button>
              <button
                type='button'
                className='auth-btn-ghost'
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setDevCode(null);
                  setServerError(null);
                  resetForm.reset();
                }}
              >
                {t('useDifferentEmail')}
              </button>
            </div>
          </form>
        ) : null}

        {!done ? (
          <p className='auth-foot-note'>
            {t('rememberedIt')}{' '}
            <Link href='/auth/sign-in' className='auth-link'>
              {t('backToSignIn')}
            </Link>
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
