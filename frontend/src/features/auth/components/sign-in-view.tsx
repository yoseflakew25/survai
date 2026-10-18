'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { PasswordInput } from '@/features/auth/components/password-input';
import { IconGoogle, IconMail } from '@/features/auth/components/survai-mark';
import { GOOGLE_OAUTH_REDIRECT_URL } from '@/lib/auth-env';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';

const magicSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email')
});

const passwordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').min(8, 'At least 8 characters')
});

type MagicValues = z.infer<typeof magicSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function SignInViewPage() {
  const { login, isSignedIn, isLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'magic' | 'password'>('password');
  const [serverError, setServerError] = useState<string | null>(null);

  const magicForm = useForm<MagicValues>({
    resolver: zodResolver(magicSchema),
    defaultValues: { email: '' }
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' }
  });

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.replace('/dashboard/overview');
    }
  }, [isLoading, isSignedIn, router]);

  async function onMagicSubmit(values: MagicValues) {
    setServerError(null);
    // Magic-link backend is not wired yet — switch into password mode with email filled.
    passwordForm.setValue('email', values.email);
    setMode('password');
    toast.success('Use your password to continue', {
      description: 'Email codes are coming soon. Sign in with your password for now.'
    });
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      toast.success('Welcome back!', {
        description: 'You have been signed in successfully.'
      });
      router.push('/dashboard/overview');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not sign in. Please try again.';
      setServerError(message);
      toast.error('Could not sign in', { description: message });
    }
  }

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          Welcome back
        </h1>
        <p className='mt-1.5 text-[15px] text-muted-foreground'>
          {mode === 'magic'
            ? "No password needed. We'll email you a code."
            : 'Sign in with your email and password.'}
        </p>
      </div>

      <div className='space-y-4'>
        <button
          type='button'
          className='flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium transition-colors hover:border-foreground/40'
          onClick={() => {
            window.location.assign(GOOGLE_OAUTH_REDIRECT_URL);
          }}
        >
          <IconGoogle className='h-4 w-4' />
          Continue with Google
        </button>

        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t border-border' />
          </div>
          <div className='relative flex justify-center text-xs'>
            <span className='bg-background px-2 text-muted-foreground'>or</span>
          </div>
        </div>

        {serverError && (
          <div className='rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive'>
            {serverError}
          </div>
        )}

        {mode === 'magic' ? (
          <form className='space-y-2' onSubmit={magicForm.handleSubmit(onMagicSubmit)}>
            <input
              type='email'
              placeholder='you@example.com'
              autoComplete='email'
              aria-label='Email'
              className='h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
              {...magicForm.register('email')}
            />
            {magicForm.formState.errors.email && (
              <p className='text-sm text-destructive'>
                {magicForm.formState.errors.email.message}
              </p>
            )}
            <button
              type='submit'
              disabled={magicForm.formState.isSubmitting}
              className='btn-back h-11 w-full text-[15px] disabled:opacity-70'
            >
              <IconMail className='h-4 w-4' />
              Email me a code
            </button>
          </form>
        ) : (
          <form className='space-y-2' onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <input
              type='email'
              placeholder='you@example.com'
              autoComplete='email'
              aria-label='Email'
              className='h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
              {...passwordForm.register('email')}
            />
            {passwordForm.formState.errors.email && (
              <p className='text-sm text-destructive'>
                {passwordForm.formState.errors.email.message}
              </p>
            )}
            <PasswordInput
              placeholder='Password'
              autoComplete='current-password'
              aria-label='Password'
              className='h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
              {...passwordForm.register('password')}
            />
            {passwordForm.formState.errors.password && (
              <p className='text-sm text-destructive'>
                {passwordForm.formState.errors.password.message}
              </p>
            )}
            <button
              type='submit'
              disabled={passwordForm.formState.isSubmitting}
              className='btn-back h-11 w-full text-[15px] disabled:opacity-70'
            >
              {passwordForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <button
          type='button'
          className='w-full text-center text-[13px] text-muted-foreground hover:text-foreground'
          onClick={() => {
            setServerError(null);
            setMode((m) => (m === 'magic' ? 'password' : 'magic'));
          }}
        >
          {mode === 'magic' ? 'Use a password instead' : 'Email me a code instead'}
        </button>

        <p className='text-center text-[13px] text-muted-foreground'>
          New organization?{' '}
          <Link href='/auth/sign-up' className='font-semibold text-foreground hover:underline'>
            Create a workspace
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
