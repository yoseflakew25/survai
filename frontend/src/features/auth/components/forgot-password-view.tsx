'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/components/ui/input-otp';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email')
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string().min(1, 'Confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export default function ForgotPasswordViewPage() {
  const { requestPasswordReset, confirmPasswordReset, isSignedIn, isLoading } =
    useAuth();
  const router = useRouter();
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

  async function onEmailSubmit(values: EmailValues) {
    setServerError(null);
    const email = values.email.trim();
    try {
      const result = await requestPasswordReset(email);
      setPendingEmail(email);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      setStep('otp');
      toast.success(
        result.dev_code ? 'Dev mode — code ready' : 'Check your email',
        {
          description: result.dev_code
            ? 'Email delivery is not configured; use the code shown on screen.'
            : 'If that address is registered, a 6-digit reset code is on the way.'
        }
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not send reset code. Please try again.';
      setServerError(message);
      toast.error('Could not send reset code', { description: message });
    }
  }

  async function onResetSubmit(values: ResetValues) {
    if (otp.length !== 6) {
      setServerError('Enter the 6-digit code from your email.');
      return;
    }
    setServerError(null);
    try {
      await confirmPasswordReset(pendingEmail, otp, values.password);
      setDone(true);
      toast.success('Password updated', {
        description: 'You can sign in with your new password.'
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not reset password. Please try again.';
      setServerError(message);
      toast.error('Reset failed', { description: message });
    }
  }

  async function onResend() {
    setServerError(null);
    setIsResending(true);
    try {
      const result = await requestPasswordReset(pendingEmail);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      toast.success(result.dev_code ? 'Dev code refreshed' : 'Code sent', {
        description: result.dev_code
          ? 'Email delivery is not configured; use the code shown on screen.'
          : 'Check your inbox for a new reset code.'
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not resend code.';
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
          <p className='text-muted-foreground text-sm'>Checking your session…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          {done
            ? 'Password updated'
            : step === 'otp'
              ? 'Enter reset code'
              : 'Forgot password'}
        </h1>
        <p className='text-muted-foreground .5 text-[15px]'>
          {done
            ? 'Your password was updated. Sign in to continue.'
            : step === 'otp'
              ? `Enter the 6-digit code we sent to ${pendingEmail}, then choose a new password.`
              : 'Enter your organization email and we’ll send a 6-digit code.'}
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
            Continue to sign in
          </Link>
        ) : null}

        {!done && step === 'email' ? (
          <form
            className='space-y-3'
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            noValidate
          >
            <div className='space-y-1.5'>
              <label
                htmlFor='forgot-email'
                className='text-foreground/80 text-[13px] font-medium'
              >
                Email
              </label>
              <input
                id='forgot-email'
                type='email'
                placeholder='you@organization.org'
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
                  Sending…
                </>
              ) : (
                'Send reset code'
              )}
            </button>
          </form>
        ) : null}

        {!done && step === 'otp' ? (
          <form
            className='space-y-4'
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            noValidate
          >
            {devCode ? (
              <div className='border-border bg-card rounded-xl border px-3.5 py-3 text-sm'>
                <p className='font-medium'>Dev code</p>
                <p className='text-muted-foreground  font-mono text-lg tracking-widest'>
                  {devCode}
                </p>
              </div>
            ) : null}

            <div className='space-y-2'>
              <label className='text-foreground/80 text-[13px] font-medium'>
                Reset code
              </label>
              <InputOTP
                maxLength={6}
                value={otp}
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
                New password
              </label>
              <PasswordInput
                id='reset-password'
                placeholder='At least 8 characters'
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
              <label
                htmlFor='reset-confirm'
                className='text-foreground/80 text-[13px] font-medium'
              >
                Confirm password
              </label>
              <PasswordInput
                id='reset-confirm'
                placeholder='Repeat password'
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
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>

            <div className='flex flex-col gap-2 sm:flex-row'>
              <button
                type='button'
                className='btn-back h-11 flex-1 text-[15px]'
                disabled={isResending}
                onClick={() => void onResend()}
              >
                {isResending ? 'Sending…' : 'Resend code'}
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
                Use a different email
              </button>
            </div>
          </form>
        ) : null}

        {!done ? (
          <p className='text-muted-foreground text-center text-[13px]'>
            Remembered it?{' '}
            <Link
              href='/auth/sign-in'
              className='text-foreground font-semibold hover:underline'
            >
              Back to sign in
            </Link>
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
