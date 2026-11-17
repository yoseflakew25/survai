'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader,
  brandCtaClass
} from '@/components/survai-panel';
import { changePassword } from '@/features/profile/api/service';
import { PasswordInput } from '@/features/auth/components/password-input';
import { toast } from '@/lib/toast';

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function getPasswordStrength(
  password: string,
  labels: Record<'weak' | 'fair' | 'good' | 'strong', string>
) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: labels.weak, color: 'bg-destructive' };
  if (score <= 3) return { score, label: labels.fair, color: 'bg-amber-500' };
  if (score <= 4) return { score, label: labels.good, color: 'bg-brand' };
  return { score, label: labels.strong, color: 'bg-brand' };
}

export default function SecurityViewPage() {
  const tAccount = useTranslations('account');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { user, isLoading } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z
            .string()
            .min(1, tAccount('validationCurrentPasswordRequired')),
          newPassword: z
            .string()
            .min(8, tAccount('validationPasswordMin'))
            .regex(/[A-Z]/, tAccount('validationPasswordUpper'))
            .regex(/[a-z]/, tAccount('validationPasswordLower'))
            .regex(/[0-9]/, tAccount('validationPasswordNumber')),
          confirmPassword: z
            .string()
            .min(1, tAccount('validationConfirmPasswordRequired'))
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: tAccount('validationPasswordsMismatch'),
          path: ['confirmPassword']
        }),
    [tAccount]
  );

  const strengthLabels = useMemo(
    () => ({
      weak: tAccount('passwordStrengthWeak'),
      fair: tAccount('passwordStrengthFair'),
      good: tAccount('passwordStrengthGood'),
      strong: tAccount('passwordStrengthStrong')
    }),
    [tAccount]
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const newPasswordValue = watch('newPassword');
  const passwordStrength = getPasswordStrength(newPasswordValue || '', strengthLabels);

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      reset();
      toast.success(tAccount('passwordUpdated'), {
        description: tAccount('passwordUpdatedDesc')
      });
    } catch (err) {
      toast.error(tAccount('passwordFailed'), {
        description: err instanceof Error ? err.message : tAccount('tryAgain')
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div
        className='flex flex-1 items-center justify-center py-16'
        role='status'
        aria-live='polite'
        aria-busy='true'
      >
        <Icons.spinner className='text-muted-foreground size-5 animate-spin' />
      </div>
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-8 md:px-6 md:pt-4'>
      <header className='mb-6'>
        <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
          {tNav('security')}
        </h1>
        <p className='text-muted-foreground  text-sm'>
          {tAccount('securityPageSubtitle', { email: user.email })}
        </p>
      </header>

      <form onSubmit={handleSubmit(onPasswordSubmit)}>
        <SurvaiPanel>
          <SurvaiPanelHeader
            tone='brand'
            icon={<Icons.lock className='size-3.5' />}
            title={tAccount('changePassword')}
            subtitle={tAccount('keepSeatSecure')}
          />
          <SurvaiPanelBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='currentPassword'>{tAccount('currentPassword')}</Label>
              <PasswordInput
                id='currentPassword'
                autoComplete='current-password'
                {...register('currentPassword')}
                className={cn(
                  'border-input bg-transparent h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  errors.currentPassword &&
                    'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {errors.currentPassword ? (
                <p className='text-destructive text-xs'>
                  {errors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='newPassword'>{tAccount('newPassword')}</Label>
                <PasswordInput
                  id='newPassword'
                  autoComplete='new-password'
                  {...register('newPassword')}
                  className={cn(
                    'border-input bg-transparent h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    errors.newPassword &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {errors.newPassword ? (
                  <p className='text-destructive text-xs'>
                    {errors.newPassword.message}
                  </p>
                ) : null}
                {newPasswordValue ? (
                  <div className='space-y-1.5'>
                    <div className='flex gap-1'>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            i <= passwordStrength.score
                              ? passwordStrength.color
                              : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                    <p className='text-muted-foreground text-xs'>
                      {passwordStrength.label} — {tAccount('passwordStrengthHint')}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>{tAccount('confirmPassword')}</Label>
                <PasswordInput
                  id='confirmPassword'
                  autoComplete='new-password'
                  {...register('confirmPassword')}
                  className={cn(
                    'border-input bg-transparent h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    errors.confirmPassword &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {errors.confirmPassword ? (
                  <p className='text-destructive text-xs'>
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
            </div>
          </SurvaiPanelBody>
          <SurvaiPanelFooter className='flex justify-end'>
            <Button
              type='submit'
              disabled={!isDirty || isChangingPassword}
              className={brandCtaClass}
            >
              {isChangingPassword ? (
                <>
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                  {tCommon('updating')}
                </>
              ) : (
                tAccount('updatePassword')
              )}
            </Button>
          </SurvaiPanelFooter>
        </SurvaiPanel>
      </form>
    </div>
  );
}