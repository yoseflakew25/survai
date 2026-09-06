'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAuth } from '@/lib/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { GOOGLE_OAUTH_REDIRECT_URL } from '@/lib/auth-env';
import { cn } from '@/lib/utils';
import * as z from 'zod';

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

const HIGHLIGHTS = [
  'Design surveys with AI assistance',
  'Conditional logic & multi-step forms',
  'Analytics, reports & review workflows'
];

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
    <div className='flex min-h-screen'>
      {/* Brand panel */}
      <aside className='bg-primary relative hidden w-[46%] flex-col justify-between overflow-hidden p-10 lg:flex lg:p-12 xl:p-16'>
        {/* Background grid pattern */}
        <div aria-hidden className='pointer-events-none absolute inset-0'>
          <div
            className='absolute inset-0 bg-[linear-gradient(to_right,rgb(255,255,255 / 9%)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255,255,255 / 9%)_1px,transparent_1px)] bg-[length:84px_84px] [mask-image:linear-gradient(to_bottom,white,rgb(255,255,255 / 0%)_78%,white)]'
          />
        </div>

        {/* Logo */}
        <Link
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
            Insights start
            <br />
            with a question.
          </h2>
          <p className='mt-6 text-base leading-relaxed text-white/85'>
            Join Survey Copilot and go from idea to analyzed results in one
            connected workspace.
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
        <div className='w-full max-w-md'>
          {/* Mobile brand row */}
          <Link href='/' aria-label='Go to home' className='mb-10 w-fit lg:hidden'>
            <img
              src='/images/logo/logo-full-light-mode.svg'
              alt='SurvAI'
              className='h-8 w-auto'
            />
          </Link>

          <p className='mt-3 text-sm text-muted-foreground lg:hidden'>
            or continue with Google
          </p>

          <h1 className='text-primary text-3xl font-bold tracking-tight'>
            Create your account
          </h1>
          <p className='text-muted-foreground '>
            Start building smarter surveys in minutes.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className='mt-8 space-y-4'
          >
            {serverError && (
              <div className='rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
                {serverError}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor='fullName' className='font-medium'>
                Full name
              </FieldLabel>
              <Input
                id='fullName'
                placeholder='Jane Doe'
                autoComplete='name'
                className='h-11'
                aria-invalid={!!errors.fullName}
                {...register('fullName')}
              />
              {errors.fullName && (
                <FieldError>{errors.fullName.message}</FieldError>
              )}
            </Field>

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
              <FieldLabel htmlFor='password' className='font-medium'>
                Password
              </FieldLabel>
              <Input
                id='password'
                type='password'
                placeholder='Min. 8 characters'
                autoComplete='new-password'
                className='h-11'
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <FieldError>{errors.password.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor='confirmPassword' className='font-medium'>
                Confirm password
              </FieldLabel>
              <Input
                id='confirmPassword'
                type='password'
                placeholder='Re-enter your password'
                autoComplete='new-password'
                className='h-11'
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <FieldError>{errors.confirmPassword.message}</FieldError>
              )}
            </Field>

            <LoadingButton
              type='submit'
              className='h-11 w-full text-[15px]'
              loading={isSubmitting}
              loadingLabel='Creating account…'
            >
              Create account
              <Icons.arrowRight className='ml-1.5 size-4' />
            </LoadingButton>
          </form>

          <Button
            variant='outline'
            className={cn('h-11 w-full text-[15px] text-primary *:hover:bg-primary/5 border-primary')}
            type='button'
            onClick={() => {
              window.location.assign(GOOGLE_OAUTH_REDIRECT_URL);
            }}
          >
            <Icons.google className='mr-2.5 size-5' />
            Continue with Google
          </Button>

          <p className='mt-4 text-center text-sm'>
            <span className='text-muted-foreground'>
              Already have an account?{' '}
            </span>
            <Link
              href='/auth/sign-in'
              className='text-primary font-medium underline-offset-4 hover:underline'
            >
              Sign in
            </Link>
          </p>

          <p className='text-muted-foreground mt-4 text-center text-xs'>
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
