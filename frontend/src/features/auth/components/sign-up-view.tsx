'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { AuthDivider, GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { PasswordInput } from '@/features/auth/components/password-input';
import { IconMail } from '@/features/auth/components/survai-mark';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { useTranslations } from 'next-intl';

type PasswordValues = {
  organizationName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpViewPage() {
  const {
    register: registerUser,
    verifyEmail,
    resendVerification,
    isSignedIn,
    isLoading
  } = useAuth();
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const passwordSchema = useMemo(
    () =>
      z
        .object({
          organizationName: z.string().min(1, t('orgNameRequired')).min(2, t('orgNameMin')),
          email: z.string().min(1, t('emailRequired')).email(t('emailInvalid')),
          password: z
            .string()
            .min(1, t('passwordRequired'))
            .min(8, t('passwordMin'))
            .regex(/[A-Z]/, t('passwordUppercase'))
            .regex(/[0-9]/, t('passwordNumber')),
          confirmPassword: z.string().min(1, t('confirmPasswordRequired'))
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('passwordsMismatch'),
          path: ['confirmPassword']
        }),
    [t]
  );
  const deepLinkHandled = useRef(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.replace('/dashboard/overview');
    }
  }, [isLoading, isSignedIn, router]);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const email = (searchParams.get('email') || '').trim();
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    deepLinkHandled.current = true;
    passwordForm.setValue('email', email);
    if (mode === 'verify') {
      setPendingEmail(email);
      setStep('otp');
    }
  }, [searchParams, passwordForm]);

  async function onPasswordSubmit(values: PasswordValues) {
    setServerError(null);
    try {
      const result = await registerUser({
        organizationName: values.organizationName,
        email: values.email,
        password: values.password
      });
      setPendingEmail(result.email);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      setStep('otp');
      toast.success(result.dev_code ? t('devModeCodeReady') : t('checkEmail'), {
        description: result.dev_code ? t('devEmailNotConfigured') : t('verificationCodeSent')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('createOrgFailed');
      setServerError(message);
      toast.error(t('couldNotCreateWorkspace'), { description: message });
    }
  }

  async function onVerifyOtp() {
    if (otp.length !== 6) {
      setServerError(t('otpIncomplete'));
      return;
    }
    setServerError(null);
    setIsVerifying(true);
    try {
      await verifyEmail(pendingEmail, otp);
      toast.success(t('emailVerified'), {
        description: t('orgReady')
      });
      router.push('/dashboard/overview');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('invalidOrExpired');
      setServerError(message);
      toast.error(t('verificationFailed'), { description: message });
    } finally {
      setIsVerifying(false);
    }
  }

  async function onResend() {
    setServerError(null);
    setIsResending(true);
    try {
      const result = await resendVerification(pendingEmail);
      setDevCode(result.dev_code ?? null);
      setOtp(result.dev_code ?? '');
      toast.success(result.dev_code ? t('devCodeRefreshed') : t('codeSent'), {
        description: result.dev_code ? t('devEmailNotConfigured') : t('resendInbox')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('couldNotResend');
      setServerError(message);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell>
      <div className='auth-head'>
        <h1 className='auth-title'>
          {step === 'otp' ? t('verifyEmailTitle') : t('signUpTitle')}
        </h1>
        <p className='auth-subtitle'>
          {step === 'otp' ? t('otpSentTo', { email: pendingEmail }) : t('signUpBody')}
        </p>
      </div>

      <div className='auth-stack'>
        {serverError ? <div className='auth-alert'>{serverError}</div> : null}

        {step === 'form' ? (
          <>
            <GoogleSignInButton
              mode='signup'
              onError={(message) => setServerError(message)}
              onSuccess={() => {
                toast.success(t('welcome'), {
                  description: t('workspaceReady')
                });
                router.push('/dashboard/overview');
              }}
            />
            <AuthDivider />
          </>
        ) : null}

        {step === 'otp' ? (
          <div className='auth-stack'>
            {devCode ? (
              <div className='auth-notice'>
                <p>{t('emailNotConfigured')}</p>
                <p>
                  {t('devCodeLabel')} <span className='auth-mono'>{devCode}</span>
                </p>
              </div>
            ) : null}
            <div className='auth-otp'>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName='gap-2'
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type='button'
              disabled={isVerifying || otp.length !== 6}
              className='auth-btn'
              onClick={() => void onVerifyOtp()}
            >
              {isVerifying ? t('verifying') : t('verifyAndContinue')}
            </button>

            <button
              type='button'
              disabled={isResending}
              className='auth-btn-ghost'
              onClick={() => void onResend()}
            >
              <IconMail className='size-3.5' />
              {isResending ? t('sending') : t('resendCode')}
            </button>

            <button
              type='button'
              className='auth-btn-ghost'
              onClick={() => {
                setServerError(null);
                setOtp('');
                setStep('form');
              }}
            >
              {t('useDifferentEmail')}
            </button>
          </div>
        ) : (
          <form className='auth-fields' onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <div className='auth-field'>
              <label htmlFor='sign-up-org' className='auth-label'>
                {t('organizationName')}
              </label>
              <input
                id='sign-up-org'
                placeholder={t('organizationName')}
                autoComplete='organization'
                className='auth-input'
                {...passwordForm.register('organizationName')}
              />
              {passwordForm.formState.errors.organizationName ? (
                <p className='auth-error-text'>
                  {passwordForm.formState.errors.organizationName.message}
                </p>
              ) : null}
            </div>
            <div className='auth-field'>
              <label htmlFor='sign-up-email' className='auth-label'>
                {t('email')}
              </label>
              <input
                id='sign-up-email'
                type='email'
                placeholder={t('emailPlaceholder')}
                autoComplete='email'
                className='auth-input'
                {...passwordForm.register('email')}
              />
              {passwordForm.formState.errors.email ? (
                <p className='auth-error-text'>{passwordForm.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className='auth-field'>
              <label htmlFor='sign-up-password' className='auth-label'>
                {t('password')}
              </label>
              <PasswordInput
                id='sign-up-password'
                placeholder={t('password')}
                autoComplete='new-password'
                {...passwordForm.register('password')}
              />
              {passwordForm.formState.errors.password ? (
                <p className='auth-error-text'>{passwordForm.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className='auth-field'>
              <label htmlFor='sign-up-confirm' className='auth-label'>
                {t('confirmPassword')}
              </label>
              <PasswordInput
                id='sign-up-confirm'
                placeholder={t('confirmPassword')}
                autoComplete='new-password'
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword ? (
                <p className='auth-error-text'>
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            <button
              type='submit'
              disabled={passwordForm.formState.isSubmitting}
              className='auth-btn'
            >
              {passwordForm.formState.isSubmitting ? t('sendingCode') : tCommon('continue')}
            </button>
          </form>
        )}

        {step === 'form' ? (
          <p className='auth-foot-note'>
            {t('alreadyHaveWorkspace')}{' '}
            <Link href='/auth/sign-in' className='auth-link'>
              {t('signIn')}
            </Link>
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
