'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { GOOGLE_OAUTH_REDIRECT_URL } from '@/lib/auth-env';
import * as z from 'zod';

const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
});

type SignInValues = z.infer<typeof signInSchema>;

const HIGHLIGHTS = [
  'AI-assisted survey design',
  'Smart collection with conditional logic',
  'Real-time analytics & reporting'
];

export default function SignInViewPage() {
  const { login, isSignedIn } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  if (isSignedIn) {
    router.push('/dashboard/overview');
    return null;
  }

  async function onSubmit(values: SignInValues) {
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
    <div className='flex min-h-screen'>
      {/* Brand panel */}
      <aside className='bg-primary relative hidden w-[46%] flex-col justify-between overflow-hidden p-10 lg:flex lg:p-12 xl:p-16'>
        {/* Background grid pattern */}
        <div aria-hidden className='pointer-events-none absolute inset-0'>
          <div
            className='absolute inset-0 bg-[linear-gradient(to_right,rgb(255,255,255 / 9%)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255,255,255 / 9%)_1px,transparent_1px)] bg-[length:84px_84px] [mask-image:linear-gradient(to_bottom,white,rgb(255,255,255 / 0%)_78%,white)]'
          />
        </div>

        {/* Logo */}            <Link
              href='/'
              aria-label='Go to home'
              className='relative w-fit rounded-md focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none'
            >
              <img
                src='/images/logo/logo-full-dark-mode.svg'
                alt='SurvAI'
                className='h-9 w-auto transition-opacity hover:opacity-85 xl:h-10'
              />
            </Link>

          

        {/* Headline + highlights */}
        <div className='relative max-w-md'>
          <h2 className='text-4xl leading-tight font-bold text-white xl:text-5xl'>
            Every voice,
            <br />
            measured.
          </h2>
          <p className='mt-6 text-base leading-relaxed text-white/85'>
            Design surveys, collect responses, and turn answers into decisions
            powered by AI at every step.
          </p>

          <ul className='mt-10 space-y-4'>
            {HIGHLIGHTS.map((item) => (
              <li key={item} className='flex items-center gap-3'>
                <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20'>
                  <Icons.circleCheck className='size-3.5 text-white' />
                </span>
                <span className='text-sm font-medium text-white/95'>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright */}
        <p className='relative text-sm text-white/60'>
          © 2026 Survey Copilot. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className='flex flex-1 items-center justify-center px-6 py-12 lg:px-10'>
        <div className='w-full max-w-md'>            {/* Mobile brand row */}
            <Link href='/' aria-label='Go to home' className='mb-10 w-fit lg:hidden'>
              <img
                src='/images/logo/logo-full-light-mode.svg'
                alt='SurvAI'
                className='h-8 w-auto'
              />
            </Link>
           

          <h1 className='text-primary text-3xl font-bold tracking-tight'>
            Welcome back!
          </h1>
          <p className='text-muted-foreground'>
            Sign in to manage your surveys and insights.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className='mt-10 space-y-5'
          >
            {serverError && (
              <div className='rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
                {serverError}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor='email' className='font-medium'>
                Email address
              </FieldLabel>
              <Input
                id='email'
                type='email'
                placeholder='you@example.com'
                autoComplete='email'
                className='h-11'
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field>
              <div className='flex items-center'>
                <FieldLabel htmlFor='password' className='font-medium'>
                  Password
                </FieldLabel>
                <Link
                  href='#'
                  className='text-muted-foreground ml-auto text-sm underline-offset-4 hover:underline'
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id='password'
                type='password'
                placeholder='Enter your password'
                autoComplete='current-password'
                className='h-11'
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <FieldError>{errors.password.message}</FieldError>
              )}
            </Field>

            <LoadingButton
              type='submit'
              className={cn('h-11 w-full text-[15px]')}
              loading={isSubmitting}
              loadingLabel='Signing in…'
            >
              Sign in
              <Icons.arrowRight className='ml-1.5 size-4' />
            </LoadingButton>
          </form>

          <Button
            variant='outline'
            className={cn('h-11 w-full text-[15px] text-[#564597] hover:bg-[#564597]/10 border-[#564597] hover:text-white hover:bg-[#564597]/20 hover:border-[#564597]')}
            type='button'
            onClick={() => {
              window.location.assign(GOOGLE_OAUTH_REDIRECT_URL);
            }}
          >
            <Icons.google className='mr-2.5 size-5' />
            Sign in with Google
          </Button>

          <p className='mt-10 text-center text-sm'>
            <span className='text-muted-foreground'>
              Don&apos;t have an account?{' '}
            </span>
            <Link
              href='/auth/sign-up'
              className='text-primary font-medium underline-offset-4 hover:underline'
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
