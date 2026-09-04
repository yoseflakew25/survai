'use client';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { Icons } from '@/components/icons';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import * as z from 'zod';
import { InteractiveGridPattern } from './interactive-grid';

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
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 p-4'>
      <Link
        href='/auth/sign-up'
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'absolute top-4 right-4 z-10 hidden md:top-8 md:right-8'
        )}
      >
        Create account
      </Link>

      {/* Decorative background */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(600px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[-20%] h-full skew-y-12 opacity-30'
          )}
        />
      </div>

      <div className='relative z-10 w-full max-w-md'>
        {/* Logo / Branding */}
        <div className='mb-8 text-center'>
          <div className='bg-primary/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-xl'>
            <Icons.sparkles className='text-primary size-6' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight'>Survey Copilot</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            AI-powered survey lifecycle platform
          </p>
        </div>

        <Card className='shadow-lg'>
          <CardHeader className='space-y-1 pb-4'>
            <CardTitle className='text-xl'>Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              {serverError && (
                <div className='rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
                  {serverError}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input
                  id='email'
                  type='email'
                  placeholder='you@organization.org'
                  autoComplete='email'
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>

              <Field>
                <div className='flex items-center'>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
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
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && <FieldError>{errors.password.message}</FieldError>}
              </Field>

              <LoadingButton
                type='submit'
                className='w-full'
                loading={isSubmitting}
                loadingLabel='Signing in…'
              >
                Sign In
              </LoadingButton>
            </form>

            <div className='mt-6 text-center text-sm'>
              <span className='text-muted-foreground'>
                Don&apos;t have an account?{' '}
              </span>
              <Link
                href='/auth/sign-up'
                className='font-medium text-primary underline-offset-4 hover:underline'
              >
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className='text-muted-foreground mt-6 text-center text-xs'>
          Protected by enterprise-grade security. Your data is encrypted at rest and in transit.
        </p>
      </div>
    </div>
  );
}
