'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  startTransition
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const passwordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'At least 8 characters')
});

type PasswordValues = z.infer<typeof passwordSchema>;

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export default function SignInViewPage() {
  const { login, isSignedIn, isLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  const { isSubmitting } = form.formState;

  const goDashboard = useEffectEvent(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    startTransition(() => {
      router.replace('/dashboard/overview');
    });
  });

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      goDashboard();
    }
  }, [isLoading, isSignedIn]);

  async function onSubmit(values: PasswordValues) {
    setServerError(null);
    try {
      await login(values.email.trim(), values.password);
      toast.success('Welcome back', {
        description: 'Signed in successfully.'
      });
      goDashboard();
    } catch (err) {
      redirectedRef.current = false;
      const message =
        err instanceof Error
          ? err.message
          : 'Could not sign in. Please try again.';
      setServerError(message);
    }
  }

  // Stable gate — avoids flashing the form while session hydrates / redirects
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
          <p className='text-muted-foreground text-sm'>
            {isSignedIn ? 'Taking you to your workspace…' : 'Checking your session…'}
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          Welcome back
        </h1>
        <p className='text-muted-foreground mt-1.5 text-[15px]'>
          Sign in with your organization email and password.
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

        <form
          className='space-y-3'
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div className='space-y-1.5'>
            <label
              htmlFor='sign-in-email'
              className='text-foreground/80 text-[13px] font-medium'
            >
              Email
            </label>
            <input
              id='sign-in-email'
              type='email'
              placeholder='you@organization.org'
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              disabled={isSubmitting}
              aria-invalid={!!form.formState.errors.email}
              className={cn(
                inputClass,
                form.formState.errors.email &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
              )}
              {...form.register('email', {
                onChange: () => {
                  if (serverError) setServerError(null);
                }
              })}
            />
            {form.formState.errors.email ? (
              <p className='text-destructive text-sm'>
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className='space-y-1.5'>
            <div className='flex items-center justify-between gap-2'>
              <label
                htmlFor='sign-in-password'
                className='text-foreground/80 text-[13px] font-medium'
              >
                Password
              </label>
              <Link
                href='/auth/forgot-password'
                className='text-muted-foreground hover:text-foreground text-[12px] font-medium hover:underline'
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id='sign-in-password'
              placeholder='Your password'
              autoComplete='current-password'
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

          <button
            type='submit'
            disabled={isSubmitting}
            className='btn-back h-11 w-full text-[15px] disabled:pointer-events-none disabled:opacity-70'
          >
            {isSubmitting ? (
              <>
                <Icons.spinner className='size-4 animate-spin' />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className='text-muted-foreground text-center text-[13px]'>
          New organization?{' '}
          <Link
            href='/auth/sign-up'
            className='text-foreground font-semibold hover:underline'
          >
            Create a workspace
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
