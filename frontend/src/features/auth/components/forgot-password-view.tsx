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

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

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
        <div
          className='flex flex-col items-center justify-center gap-3 py-16'
          role='status'
          aria-live='polite'
          aria-busy='true'
        >
          <Icons.spinner className='text-muted-foreground size-5 animate-spin' />
          <p className='text-muted-foreground text-sm'>{t('checkingSession')}</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          {done ? t('passwordUpdated') : step === 'otp' ? t('enterResetCode') : t('forgotTitle')}
        </h1>
        <p className='text-muted-foreground .5 text-[15px]'>
          {done
            ? t('passwordUpdatedHint')
            : step === 'otp'
              ? t('resetCodeHint', { email: pendingEmail })
              : t('forgotHint')}
        </p>
      </div>

      <div className='space-y-4'>
        {serverError ? (
          <div
            role='alert'
            className='border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3.5 py-2.5 text-sm'
          >
            {serverError}
          </div>
        ) : null}

        {done ? (
          <Link
            href='/auth/sign-in'
            className='btn-back flex h-11 w-full items-center justify-center text-[15px]'
          >
            {t('continueToSignIn')}
          </Link>
        ) : null}

        {!done && step === 'email' ? (
          <form className='space-y-3' onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate>
            <div className='space-y-1.5'>
              <label htmlFor='forgot-email' className='text-foreground/80 text-[13px] font-medium'>
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
                className={cn(
                  inputClass,
                  emailForm.formState.errors.email &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
                )}
                {...emailForm.register('email', {
                  onChange: () => {
                    if (serverError) setServerError(null);
                  }
                })}
              />
              {emailForm.formState.errors.email ? (
                <p className='text-destructive text-sm'>
                  {emailForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <button
              type='submit'
              disabled={emailForm.formState.isSubmitting}
              className='btn-back h-11 w-full text-[15px] disabled:pointer-events-none disabled:opacity-70'
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
          <form className='space-y-4' onSubmit={resetForm.handleSubmit(onResetSubmit)} noValidate>
            {devCode ? (
              <div className='border-border bg-card rounded-xl border px-3.5 py-3 text-sm'>
                <p className='font-medium'>{t('devCode')}</p>
                <p className='text-muted-foreground  font-mono text-lg tracking-widest'>
                  {devCode}
                </p>
              </div>
            ) : null}

            <div className='space-y-2'>
              <p id='reset-code-label' className='text-foreground/80 text-[13px] font-medium'>
                {t('resetCode')}
              </p>
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

            <div className='space-y-1.5'>
              <label
                htmlFor='reset-password'
                className='text-foreground/80 text-[13px] font-medium'
              >
                {t('newPassword')}
              </label>
              <PasswordInput
                id='reset-password'
                placeholder={t('newPasswordPlaceholder')}
                autoComplete='new-password'
                disabled={resetForm.formState.isSubmitting}
                aria-invalid={!!resetForm.formState.errors.password}
                className={cn(
                  inputClass,
                  resetForm.formState.errors.password &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
                )}
                {...resetForm.register('password', {
                  onChange: () => {
                    if (serverError) setServerError(null);
                  }
                })}
              />
              {resetForm.formState.errors.password ? (
                <p className='text-destructive text-sm'>
                  {resetForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className='space-y-1.5'>
              <label htmlFor='reset-confirm' className='text-foreground/80 text-[13px] font-medium'>
                {t('confirmPassword')}
              </label>
              <PasswordInput
                id='reset-confirm'
                placeholder={t('repeatPassword')}
                autoComplete='new-password'
                disabled={resetForm.formState.isSubmitting}
                aria-invalid={!!resetForm.formState.errors.confirmPassword}
                className={cn(
                  inputClass,
                  resetForm.formState.errors.confirmPassword &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
                )}
                {...resetForm.register('confirmPassword')}
              />
              {resetForm.formState.errors.confirmPassword ? (
                <p className='text-destructive text-sm'>
                  {resetForm.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <button
              type='submit'
              disabled={resetForm.formState.isSubmitting || otp.length !== 6}
              className='btn-back h-11 w-full text-[15px] disabled:pointer-events-none disabled:opacity-70'
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

            <div className='flex flex-col gap-2 sm:flex-row'>
              <button
                type='button'
                className='btn-back h-11 flex-1 text-[15px]'
                disabled={isResending}
                onClick={() => void onResend()}
              >
                {isResending ? t('sending') : t('resendCode')}
              </button>
              <button
                type='button'
                className='text-muted-foreground h-11 flex-1 text-[13px] font-medium hover:underline'
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
          <p className='text-muted-foreground text-center text-[13px]'>
            {t('rememberedIt')}{' '}
            <Link href='/auth/sign-in' className='text-foreground font-semibold hover:underline'>
              {t('backToSignIn')}
            </Link>
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
