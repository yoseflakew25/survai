'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const schema = z
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

type FormValues = z.infer<typeof schema>;

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export default function ResetPasswordViewPage() {
  const { confirmPasswordReset, isSignedIn, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();

  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.replace('/dashboard/overview');
    }
  }, [isLoading, isSignedIn, router]);

  async function onSubmit(values: FormValues) {
    if (!token) {
      setServerError('This reset link is missing or invalid.');
      return;
    }
    setServerError(null);
    try {
      await confirmPasswordReset(token, values.password);
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

  const missingToken = !token;

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          Set a new password
        </h1>
        <p className='text-muted-foreground mt-1.5 text-[15px]'>
          {done
            ? 'Your password was updated. Sign in to continue.'
            : 'Choose a strong password for your organization account.'}
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

        {missingToken && !done ? (
          <div className='space-y-4'>
            <div
              role='alert'
              className='border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3.5 py-2.5 text-sm'
            >
              This reset link is missing or invalid. Request a new one from the
              forgot password page.
            </div>
            <Link
              href='/auth/forgot-password'
              className='btn-back flex h-11 w-full items-center justify-center text-[15px]'
            >
              Request a new link
            </Link>
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

        {!missingToken && !done ? (
          <form
            className='space-y-3'
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
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
                disabled={isSubmitting}
                aria-invalid={!!form.formState.errors.password}
                className={cn(
                  inputClass,
                  form.formState.errors.password &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
                )}
                {...form.register('password', {
                  onChange: () => {
                    if (serverError) setServerError(null);
                  }
                })}
              />
              {form.formState.errors.password ? (
                <p className='text-destructive text-sm'>
                  {form.formState.errors.password.message}
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
                disabled={isSubmitting}
                aria-invalid={!!form.formState.errors.confirmPassword}
                className={cn(
                  inputClass,
                  form.formState.errors.confirmPassword &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
                )}
                {...form.register('confirmPassword', {
                  onChange: () => {
                    if (serverError) setServerError(null);
                  }
                })}
              />
              {form.formState.errors.confirmPassword ? (
                <p className='text-destructive text-sm'>
                  {form.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <button
              type='submit'
              disabled={isSubmitting}
              className='btn-back h-11 w-full text-[15px] disabled:pointer-events-none disabled:opacity-70'
            >
              {isSubmitting ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        ) : null}

        {!done ? (
          <p className='text-muted-foreground text-center text-[13px]'>
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
