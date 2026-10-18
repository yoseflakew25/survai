'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
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
  const { login, isSignedIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [serverError, setServerError] = useState<string | null>(null);

  const magicForm = useForm<MagicValues>({
    resolver: zodResolver(magicSchema),
    defaultValues: { email: '' }
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' }
  });

  if (isSignedIn) {
    router.push('/dashboard/overview');
    return null;
  }

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
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setServerError(message);
      toast.error('Sign in failed', { description: message });
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
        <div className='flex gap-2'>
          <button
            type='button'
            className='flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium transition-colors hover:border-foreground/40'
            onClick={() => {
              toast.info('GitHub sign-in is coming soon');
            }}
          >
            <svg className='h-4 w-4' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
              <path d='M12 2C6.477 2 2 6.486 2 12.021c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.013-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.56 9.56 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.025 10.025 0 0 0 22 12.021C22 6.486 17.523 2 12 2z' />
            </svg>
            GitHub
          </button>
          <button
            type='button'
            className='flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium transition-colors hover:border-foreground/40'
            onClick={() => {
              window.location.assign(GOOGLE_OAUTH_REDIRECT_URL);
            }}
          >
            <IconGoogle className='h-4 w-4' />
            Google
          </button>
        </div>

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
            <input
              type='password'
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
          No account?{' '}
          <Link href='/auth/sign-up' className='font-semibold text-foreground hover:underline'>
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
