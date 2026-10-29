'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email')
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export default function ForgotPasswordViewPage() {
  const { requestPasswordReset, isSignedIn, isLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
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
    setServerError(null);
    setDevResetUrl(null);
    const email = values.email.trim();
    try {
      const result = await requestPasswordReset(email);
      setSentTo(email);
      setDevResetUrl(result.dev_reset_url ?? null);
      toast.success(
        result.dev_reset_url ? 'Dev mode — reset link ready' : 'Check your email',
        {
          description: result.dev_reset_url
            ? 'Email delivery is not configured; use the link shown on screen.'
            : 'If that address is registered, a reset link is on the way.'
        }
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not send reset email. Please try again.';
      setServerError(message);
      toast.error('Could not send reset email', { description: message });
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

  return (
    <AuthShell>
      <div className='mb-6'>
        <h1 className='font-display text-3xl font-extrabold tracking-[-0.03em]'>
          Forgot password
        </h1>
        <p className='text-muted-foreground mt-1.5 text-[15px]'>
          {sentTo
            ? `If an account exists for ${sentTo}, we sent a reset link.`
            : 'Enter your organization email and we’ll send a reset link.'}
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

        {sentTo ? (
          <div className='space-y-4'>
            <div className='border-border bg-card rounded-xl border px-3.5 py-3 text-sm'>
              <p className='text-foreground font-medium'>
                {devResetUrl ? 'Reset link ready' : 'Check your inbox'}
              </p>
              <p className='text-muted-foreground mt-0.5'>
                {devResetUrl
                  ? 'Email delivery is not configured on this API. Open the link below to choose a new password.'
                  : 'The link expires in about an hour. Didn’t get it? You can request another below.'}
              </p>
              {devResetUrl ? (
                <p className='mt-3 break-all'>
                  <Link
                    href={devResetUrl}
                    className='text-foreground font-semibold underline-offset-4 hover:underline'
                  >
                    {devResetUrl}
                  </Link>
                </p>
              ) : null}
            </div>
            <button
              type='button'
              className='btn-back h-11 w-full text-[15px]'
              onClick={() => {
                setSentTo(null);
                setDevResetUrl(null);
                setServerError(null);
              }}
            >
              Send another link
            </button>
          </div>
        ) : (
          <form
            className='space-y-3'
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className='space-y-1.5'>
              <label
                htmlFor='forgot-email'
                className='text-foreground/80 text-[13px] font-medium'
              >
                Email
              </label>
              <input
                id='forgot-email'
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

            <button
              type='submit'
              disabled={isSubmitting}
              className='btn-back h-11 w-full text-[15px] disabled:pointer-events-none disabled:opacity-70'
            >
              {isSubmitting ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' />
                  Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}

        <p className='text-muted-foreground text-center text-[13px]'>
          Remembered it?{' '}
          <Link
            href='/auth/sign-in'
            className='text-foreground font-semibold hover:underline'
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
