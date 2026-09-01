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
import { toast } from 'sonner';
import * as z from 'zod';
import { InteractiveGridPattern } from './interactive-grid';

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpViewPage() {
  const { register: registerUser, isSignedIn } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  if (isSignedIn) {
    router.push('/dashboard/overview');
    return null;
  }

  async function onSubmit(values: SignUpValues) {
    setServerError(null);
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password
      });
      toast.success('Account created!', {
        description: 'Welcome to Survey Copilot. Your account is ready.'
      });
      router.push('/dashboard/overview');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setServerError(message);
      toast.error('Registration failed', { description: message });
    }
  }

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 p-4'>
      <Link
        href='/auth/sign-in'
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'absolute top-4 right-4 z-10 hidden md:top-8 md:right-8'
        )}
      >
        Sign in
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
            <CardTitle className='text-xl'>Create your account</CardTitle>
            <CardDescription>
              Get started with AI-powered survey creation and analysis
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
                <FieldLabel htmlFor='fullName'>Full name</FieldLabel>
                <Input
                  id='fullName'
                  placeholder='Jane Doe'
                  autoComplete='name'
                  aria-invalid={!!errors.fullName}
                  {...register('fullName')}
                />
                {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
              </Field>

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
                <FieldLabel htmlFor='password'>Password</FieldLabel>
                <Input
                  id='password'
                  type='password'
                  placeholder='Min. 8 characters'
                  autoComplete='new-password'
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && <FieldError>{errors.password.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor='confirmPassword'>Confirm password</FieldLabel>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='Re-enter your password'
                  autoComplete='new-password'
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <FieldError>{errors.confirmPassword.message}</FieldError>
                )}
              </Field>

              <LoadingButton
                type='submit'
                className='w-full'
                loading={isSubmitting}
                loadingLabel='Creating account…'
              >
                Create Account
              </LoadingButton>
            </form>

            <div className='mt-6 text-center text-sm'>
              <span className='text-muted-foreground'>
                Already have an account?{' '}
              </span>
              <Link
                href='/auth/sign-in'
                className='font-medium text-primary underline-offset-4 hover:underline'
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className='text-muted-foreground mt-6 text-center text-xs'>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
