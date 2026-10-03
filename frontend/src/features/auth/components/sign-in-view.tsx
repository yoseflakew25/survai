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
    <div className='min-h-screen bg-background grid  md:grid-cols-2 justify-center items-center'>
      {/* Left panel: Creative Hero Image with margin & rounded corners */}
      {/* <aside className='relative hidden w-1/2 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-[#F2F4FA]  md:flex  lg:rounded-3xl dark:bg-card'> */}
<div className='flex items-center justify-center'>

        <img
          src='/images/auth-page-hero.svg'
          alt='SurvAI Auth Illustration'
          className='max-h-[95vh] rounded-3xl'
        />
               </div>

      {/* </aside> */}

      {/* Right panel: Form + Logo */}
      <div className='flex flex-1 items-center justify-center px-6 py-12 md:px-8'>
        <div className='w-full max-w-md'>
          {/* Logo on right side */}
          <Link
            href='/'
            aria-label='Go to home'
            className='mb-8 block w-fit rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none'
          >
            <img
              src='/images/logo/logo-full-light-mode.svg'
              alt='SurvAI'
              className='h-9 w-auto transition-opacity hover:opacity-85 dark:hidden xl:h-10'
            />
            <img
              src='/images/logo/logo-full-dark-mode.svg'
              alt='SurvAI'
              className='hidden h-9 w-auto transition-opacity hover:opacity-85 dark:block xl:h-10'
            />
          </Link>

          <h1 className='text-3xl font-bold tracking-tight text-foreground'>
            Welcome back!
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Sign in to manage your surveys and insights.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className='mt-8 space-y-5'>
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
                  className='ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline'
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

          <div className='relative my-6'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-border' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant='outline'
            className={cn('h-11 w-full text-[15px]')}
            type='button'
            onClick={() => {
              window.location.assign(GOOGLE_OAUTH_REDIRECT_URL);
            }}
          >
            <Icons.google className='mr-2.5 size-5' />
            Sign in with Google
          </Button>

          <p className='mt-8 text-center text-sm'>
            <span className='text-muted-foreground'>
              Don&apos;t have an account?{' '}
            </span>
            <Link
              href='/auth/sign-up'
              className='font-medium text-primary underline-offset-4 hover:underline'
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

