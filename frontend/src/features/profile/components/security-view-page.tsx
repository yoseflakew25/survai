'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
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

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-brand' };
  return { score, label: 'Strong', color: 'bg-brand' };
}

export default function SecurityViewPage() {
  const { user, isLoading } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
  const passwordStrength = getPasswordStrength(newPasswordValue || '');

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      reset();
      toast.success('Password updated', {
        description: 'Use your new password the next time you sign in.'
      });
    } catch (err) {
      toast.error('Could not update password', {
        description: err instanceof Error ? err.message : 'Try again'
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
          Security
        </h1>
        <p className='text-muted-foreground  text-sm'>
          Update the password for {user.email}.
        </p>
      </header>

      <form onSubmit={handleSubmit(onPasswordSubmit)}>
        <SurvaiPanel>
          <SurvaiPanelHeader
            icon={<Icons.lock className='size-3.5' />}
            title='Change Password'
            subtitle='Keep your seat account secure.'
          />
          <SurvaiPanelBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='currentPassword'>Current Password</Label>
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
                <Label htmlFor='newPassword'>New Password</Label>
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
                      {passwordStrength.label} — use 8+ characters with upper,
                      lower, and numbers
                    </p>
                  </div>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Confirm New Password</Label>
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
                  Updating…
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </SurvaiPanelFooter>
        </SurvaiPanel>
      </form>
    </div>
  );
}
