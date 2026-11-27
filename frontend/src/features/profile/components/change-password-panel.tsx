'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import * as z from 'zod';

import { Icons } from '@/components/icons';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader,
  planFieldLabelClass,
  primaryCtaClass
} from '@/components/survai-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/features/auth/components/password-input';
import { changePassword } from '@/features/profile/api/service';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

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
  if (score <= 4) return { score, label: labels.good, color: 'bg-brand-strong' };
  return { score, label: labels.strong, color: 'bg-brand-strong' };
}

export function ChangePasswordPanel({ subtitle }: { subtitle: string }) {
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordPreview, setNewPasswordPreview] = useState('');

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, tAccount('validationCurrentPasswordRequired')),
          newPassword: z
            .string()
            .min(8, tAccount('validationPasswordMin'))
            .regex(/[A-Z]/, tAccount('validationPasswordUpper'))
            .regex(/[a-z]/, tAccount('validationPasswordLower'))
            .regex(/[0-9]/, tAccount('validationPasswordNumber')),
          confirmPassword: z.string().min(1, tAccount('validationConfirmPasswordRequired'))
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

  const passwordStrength = getPasswordStrength(newPasswordPreview, strengthLabels);
  const rules = [
    { label: tAuth('passwordMin'), met: newPasswordPreview.length >= 8 },
    { label: tAuth('passwordUppercase'), met: /[A-Z]/.test(newPasswordPreview) },
    { label: tAuth('passwordNumber'), met: /[0-9]/.test(newPasswordPreview) }
  ];

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      reset();
      setNewPasswordPreview('');
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

  return (
    <form onSubmit={handleSubmit(onPasswordSubmit)} noValidate>
      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.lock className='size-3.5' />}
          title={tAccount('changePassword')}
          subtitle={subtitle}
        />
        <SurvaiPanelBody className='space-y-5'>
          <div className='space-y-2 border-b border-border/70 pb-5'>
            <Label htmlFor='currentPassword' className={planFieldLabelClass}>
              {tAccount('currentPassword')}
            </Label>
            <PasswordInput
              id='currentPassword'
              variant='app'
              placeholder='••••••••'
              autoComplete='current-password'
              disabled={isChangingPassword}
              aria-invalid={!!errors.currentPassword}
              className={cn(
                errors.currentPassword &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              )}
              {...register('currentPassword')}
            />
            {errors.currentPassword ? (
              <p className='text-destructive text-xs'>{errors.currentPassword.message}</p>
            ) : null}
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='newPassword' className={planFieldLabelClass}>
                {tAccount('newPassword')}
              </Label>
              <PasswordInput
                id='newPassword'
                variant='app'
                placeholder={tAuth('newPasswordPlaceholder')}
                autoComplete='new-password'
                disabled={isChangingPassword}
                aria-invalid={!!errors.newPassword}
                className={cn(
                  errors.newPassword &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                )}
                {...register('newPassword', {
                  onChange: (event) => setNewPasswordPreview(event.target.value)
                })}
              />
              {errors.newPassword ? (
                <p className='text-destructive text-xs'>{errors.newPassword.message}</p>
              ) : null}

              {newPasswordPreview ? (
                <div className='space-y-1.5 pt-1'>
                  <div className='flex gap-1'>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1.5 flex-1 rounded-none transition-colors',
                          i <= passwordStrength.score ? passwordStrength.color : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <p className='font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                    {passwordStrength.label}
                  </p>
                </div>
              ) : null}

              <div className='flex flex-wrap gap-1.5 pt-1'>
                {rules.map((rule) => (
                  <span
                    key={rule.label}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-none border px-2 py-0.5 font-mono text-[10px] font-medium transition-colors',
                      rule.met
                        ? 'border-foreground/25 bg-brand-soft text-foreground font-semibold'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {rule.met ? <Icons.check className='size-3 shrink-0' /> : null}
                    {rule.label}
                  </span>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword' className={planFieldLabelClass}>
                {tAccount('confirmPassword')}
              </Label>
              <PasswordInput
                id='confirmPassword'
                variant='app'
                placeholder={tAuth('repeatPassword')}
                autoComplete='new-password'
                disabled={isChangingPassword}
                aria-invalid={!!errors.confirmPassword}
                className={cn(
                  errors.confirmPassword &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                )}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className='text-destructive text-xs'>{errors.confirmPassword.message}</p>
              ) : null}
            </div>
          </div>
        </SurvaiPanelBody>

        <SurvaiPanelFooter className='flex flex-wrap items-center justify-between gap-3 bg-muted/30'>
          <p className='font-mono text-[11px] text-muted-foreground'>
            {tAccount('passwordStrengthHint')}
          </p>
          <Button
            type='submit'
            disabled={!isDirty || isChangingPassword}
            className={cn(
              primaryCtaClass,
              'ml-auto disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100'
            )}
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
  );
}
