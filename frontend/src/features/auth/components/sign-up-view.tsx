'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import { IconMail } from '@/features/auth/components/survai-mark';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/components/ui/input-otp';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';

const passwordSchema = z
  .object({
    organizationName: z
      .string()
      .min(1, 'Organization name is required')
      .min(2, 'At least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
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

type PasswordValues = z.infer<typeof passwordSchema>;

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export default function SignUpViewPage() {
  const {
    register: registerUser,
    verifyEmail,
    resendVerification,
    isSignedIn,
    isLoading
  } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.replace('/dashboard/overview');
    }
  }, [isLoading, isSignedIn, router]);

  async function onPasswordSubmit(values: PasswordValues) {
    setServerError(null);
    try {
      const result = await registerUser({
        organizationName: values.organizationName,
        email: values.email,
        password: values.password
      });
      setPendingEmail(result.email);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      setStep('otp');
      toast.success(
        result.dev_code ? 'Dev mode — code ready' : 'Check your email',
        {
          description: result.dev_code
            ? 'Email delivery is not configured; use the code shown on screen.'
            : 'We sent a 6-digit verification code.'
        }
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not create your organization. Please try again.';
      setServerError(message);
      toast.error('Could not create workspace', { description: message });
    }
  }

  async function onVerifyOtp() {
    if (otp.length !== 6) {
      setServerError('Enter the 6-digit code from your email.');
      return;
    }
    setServerError(null);
    setIsVerifying(true);
    try {
      await verifyEmail(pendingEmail, otp);
      toast.success('Email verified', {
        description: 'Your organization account is ready.'
      });
      router.push('/dashboard/overview');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid or expired code. Try again.';
      setServerError(message);
      toast.error('Verification failed', { description: message });
    } finally {
      setIsVerifying(false);
    }
  }

  async function onResend() {
    setServerError(null);
    setIsResending(true);
    try {
      const result = await resendVerification(pendingEmail);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      toast.success(result.dev_code ? 'Dev code refreshed' : 'Code sent', {
        description: result.dev_code
          ? 'Email delivery is not configured; use the code shown on screen.'
          : 'Check your inbox for a new verification code.'
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not resend code.';
      setServerError(message);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          {step === 'otp' ? 'Verify your email' : 'Create your organization'}
        </h1>
        <p className='mt-1.5 text-[15px] text-muted-foreground'>
          {step === 'otp'
            ? `Enter the 6-digit code we sent to ${pendingEmail}.`
            : 'One organization account to plan, build, collect, and analyze surveys.'}
        </p>
      </div>

      <div className='space-y-4'>
        {serverError ? (
          <div className='rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive'>
            {serverError}
          </div>
        ) : null}

        {step === 'otp' ? (
          <div className='space-y-4'>
            {devCode ? (
              <div className='rounded-xl border border-[color-mix(in_srgb,var(--gold)_50%,var(--border))] bg-[color-mix(in_srgb,var(--gold)_12%,var(--card))] px-3.5 py-2.5 text-sm'>
                <p className='font-medium text-foreground'>
                  Email is not configured yet
                </p>
                <p className='text-muted-foreground mt-0.5'>
                  Dev code:{' '}
                  <span className='font-mono text-base font-semibold tracking-widest text-foreground'>
                    {devCode}
                  </span>
                </p>
              </div>
            ) : null}
            <div className='flex justify-center'>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName='gap-2'
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className='size-11 text-base' />
                  <InputOTPSlot index={1} className='size-11 text-base' />
                  <InputOTPSlot index={2} className='size-11 text-base' />
                  <InputOTPSlot index={3} className='size-11 text-base' />
                  <InputOTPSlot index={4} className='size-11 text-base' />
                  <InputOTPSlot index={5} className='size-11 text-base' />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type='button'
              disabled={isVerifying || otp.length !== 6}
              className='btn-back h-11 w-full text-[15px] disabled:opacity-70'
              onClick={() => void onVerifyOtp()}
            >
              {isVerifying ? 'Verifying…' : 'Verify and continue'}
            </button>

            <button
              type='button'
              disabled={isResending}
              className='flex w-full items-center justify-center gap-1.5 text-center text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-70'
              onClick={() => void onResend()}
            >
              <IconMail className='size-3.5' />
              {isResending ? 'Sending…' : 'Resend code'}
            </button>

            <button
              type='button'
              className='w-full text-center text-[13px] text-muted-foreground hover:text-foreground'
              onClick={() => {
                setServerError(null);
                setOtp('');
                setStep('form');
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form
            className='space-y-2'
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          >
            <input
              placeholder='Organization name'
              autoComplete='organization'
              aria-label='Organization name'
              className={inputClass}
              {...passwordForm.register('organizationName')}
            />
            {passwordForm.formState.errors.organizationName ? (
              <p className='text-sm text-destructive'>
                {passwordForm.formState.errors.organizationName.message}
              </p>
            ) : null}
            <input
              type='email'
              placeholder='you@example.com'
              autoComplete='email'
              aria-label='Email'
              className={inputClass}
              {...passwordForm.register('email')}
            />
            {passwordForm.formState.errors.email ? (
              <p className='text-sm text-destructive'>
                {passwordForm.formState.errors.email.message}
              </p>
            ) : null}
            <PasswordInput
              placeholder='Password'
              autoComplete='new-password'
              aria-label='Password'
              className={inputClass}
              {...passwordForm.register('password')}
            />
            {passwordForm.formState.errors.password ? (
              <p className='text-sm text-destructive'>
                {passwordForm.formState.errors.password.message}
              </p>
            ) : null}
            <PasswordInput
              placeholder='Confirm password'
              autoComplete='new-password'
              aria-label='Confirm password'
              className={inputClass}
              {...passwordForm.register('confirmPassword')}
            />
            {passwordForm.formState.errors.confirmPassword ? (
              <p className='text-sm text-destructive'>
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            ) : null}
            <button
              type='submit'
              disabled={passwordForm.formState.isSubmitting}
              className='btn-back h-11 w-full text-[15px] disabled:opacity-70'
            >
              {passwordForm.formState.isSubmitting
                ? 'Sending code…'
                : 'Continue'}
            </button>
          </form>
        )}

        {step === 'form' ? (
          <p className='text-center text-[13px] text-muted-foreground'>
            Already have a workspace?{' '}
            <Link
              href='/auth/sign-in'
              className='font-semibold text-foreground hover:underline'
            >
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
