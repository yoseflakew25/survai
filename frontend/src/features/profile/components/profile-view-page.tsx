'use client';

import { isOrgOwner, useAuth, type AuthUser } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader,
  brandCtaClass
} from '@/components/survai-panel';
import {
  changePassword,
  deleteMyAccount,
  updateMe
} from '@/features/profile/api/service';
import { PasswordInput } from '@/features/auth/components/password-input';
import { TeamPanel } from '@/features/team/components/team-panel';
import { toast } from '@/lib/toast';

type ProfileFormValues = {
  organizationName: string;
  fullName: string;
  phone?: string;
  jobTitle?: string;
  bio?: string;
  website?: string;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileSection = 'profile' | 'team' | 'security' | 'danger';

function normalizeWebsite(value: string | undefined): string | null {
  const trimmed = value?.trim() || '';
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function sectionFromTab(tab: string | null): ProfileSection {
  if (tab === 'team' || tab === 'security' || tab === 'danger') {
    return tab;
  }
  return 'profile';
}

export default function ProfileViewPage() {
  const tAccount = useTranslations('account');
  const tTeam = useTranslations('team');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { user, setUserFromApi, logout, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const owner = isOrgOwner(user?.role);

  const profileSchema = useMemo(
    () =>
      z.object({
        organizationName: z
          .string()
          .min(2, tAccount('validationOrgMin'))
          .max(100, tAccount('validationOrgMax')),
        fullName: z
          .string()
          .min(2, tAccount('validationNameMin'))
          .max(100, tAccount('validationNameMax')),
        phone: z
          .string()
          .optional()
          .refine((val) => !val || /^\+?[\d\s\-()]{7,20}$/.test(val), {
            message: tAccount('validationPhone')
          }),
        jobTitle: z
          .string()
          .optional()
          .refine((val) => !val || val.length <= 100, {
            message: tAccount('validationJobTitleMax')
          }),
        bio: z
          .string()
          .optional()
          .refine((val) => !val || val.length <= 500, {
            message: tAccount('validationBioMax')
          }),
        website: z
          .string()
          .optional()
          .refine(
            (val) =>
              !val ||
              /^https?:\/\/.+/i.test(val) ||
              /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(val),
            { message: tAccount('validationWebsite') }
          )
      }),
    [tAccount]
  );

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

  const navItems: { id: ProfileSection; label: string; icon: keyof typeof Icons }[] =
    useMemo(
      () => [
        { id: 'profile', label: tAccount('profile'), icon: 'account' },
        { id: 'team', label: tTeam('title'), icon: 'users' },
        { id: 'security', label: tNav('security'), icon: 'lock' },
        { id: 'danger', label: tAccount('dangerZone'), icon: 'logout' }
      ],
      [tAccount, tTeam, tNav]
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
  const [activeSection, setActiveSection] = useState<ProfileSection>(() =>
    sectionFromTab(searchParams.get('tab'))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setActiveSection(sectionFromTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && user && !owner) {
      router.replace('/dashboard/overview');
    }
  }, [isLoading, user, owner, router]);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
    watch: watchProfile,
    reset: resetProfile
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      organizationName: '',
      fullName: '',
      phone: '',
      jobTitle: '',
      bio: '',
      website: ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isDirty: isPasswordDirty },
    reset: resetPassword,
    watch: watchPassword
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    if (!user) return;
    resetProfile({
      organizationName: user.organizationName || '',
      fullName: user.fullName || '',
      phone: user.phone || '',
      jobTitle: user.jobTitle || '',
      bio: user.bio || '',
      website: user.organizationWebsite || ''
    });
  }, [user, resetProfile]);

  const newPasswordValue = watchPassword('newPassword');

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: strengthLabels.weak, color: 'bg-destructive' };
    if (score <= 3) return { score, label: strengthLabels.fair, color: 'bg-amber-500' };
    if (score <= 4) return { score, label: strengthLabels.good, color: 'bg-success' };
    return { score, label: strengthLabels.strong, color: 'bg-primary' };
  };

  const passwordStrength = getPasswordStrength(newPasswordValue || '');

  if (!user) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <p className='text-muted-foreground'>{tAccount('notSignedIn')}</p>
      </div>
    );
  }

  const displayName = user.organizationName || user.fullName;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const updated = await updateMe({
        organization_name: data.organizationName,
        full_name: data.fullName,
        phone: data.phone?.trim() || null,
        job_title: data.jobTitle?.trim() || null,
        bio: data.bio?.trim() || null,
        organization_website: normalizeWebsite(data.website)
      });
      setUserFromApi(updated);
      resetProfile({
        organizationName: updated.organization_name || '',
        fullName: updated.full_name,
        phone: updated.phone || '',
        jobTitle: updated.job_title || '',
        bio: updated.bio || '',
        website: updated.organization_website || ''
      });
      toast.success(tAccount('saved'), {
        description: tAccount('profileSavedDesc')
      });
    } catch (err) {
      toast.error(tAccount('saveFailed'), {
        description: err instanceof Error ? err.message : tAccount('tryAgain')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      resetPassword();
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
  };

  const onDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      toast.success(tAccount('organizationDeleted'));
      await logout();
      // RequireAuth shows signing-out / redirect screens
    } catch (err) {
      toast.error(tAccount('couldNotDeleteAccount'), {
        description: err instanceof Error ? err.message : tAccount('tryAgain')
      });
      setIsDeleting(false);
    }
  };

  if (isLoading || !user || !owner) {
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
          {tNav('account')}
        </h1>
        <p className='text-muted-foreground  text-sm'>{tAccount('subtitle')}</p>
      </header>

      <div
        role='tablist'
        aria-label={tAccount('sectionsAria')}
        className='mb-6 flex flex-wrap gap-1 rounded-full bg-brand-soft p-1'
      >
        {navItems.map((item) => {
          const Icon = Icons[item.icon];
          const isActive = activeSection === item.id;
          const isDanger = item.id === 'danger';

          return (
            <button
              key={item.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                isActive && !isDanger && 'bg-card text-foreground shadow-sm',
                isActive &&
                  isDanger &&
                  'bg-destructive/10 text-destructive shadow-sm',
                !isActive &&
                  !isDanger &&
                  'text-muted-foreground hover:text-foreground',
                !isActive &&
                  isDanger &&
                  'text-muted-foreground hover:text-destructive'
              )}
            >
              {Icon ? <Icon className='size-3.5' /> : null}
              {item.label}
            </button>
          );
        })}
      </div>

      <div role='tabpanel' className='min-w-0'>
        {activeSection === 'profile' && (
          <ProfileSection
            user={user}
            initials={initials}
            registerProfile={registerProfile}
            handleSubmitProfile={handleSubmitProfile}
            profileErrors={profileErrors}
            isProfileDirty={isProfileDirty}
            watchProfile={watchProfile}
            isSaving={isSaving}
            onProfileSubmit={onProfileSubmit}
            brandCtaClass={brandCtaClass}
          />
        )}

        {activeSection === 'team' && <TeamPanel />}

        {activeSection === 'security' && (
          <SecuritySection
            registerPassword={registerPassword}
            handleSubmitPassword={handleSubmitPassword}
            passwordErrors={passwordErrors}
            isPasswordDirty={isPasswordDirty}
            isChangingPassword={isChangingPassword}
            newPasswordValue={newPasswordValue}
            passwordStrength={passwordStrength}
            onPasswordSubmit={onPasswordSubmit}
            brandCtaClass={brandCtaClass}
          />
        )}
        {activeSection === 'danger' && (
          <DangerSection
            organizationName={user.organizationName || user.fullName}
            isDeleting={isDeleting}
            onDelete={onDeleteAccount}
          />
        )}
      </div>
    </div>
  );
}

function ProfileSection({
  user,
  initials,
  registerProfile,
  handleSubmitProfile,
  profileErrors,
  isProfileDirty,
  watchProfile,
  isSaving,
  onProfileSubmit,
  brandCtaClass
}: {
  user: AuthUser;
  initials: string;
  registerProfile: ReturnType<typeof useForm<ProfileFormValues>>['register'];
  handleSubmitProfile: ReturnType<typeof useForm<ProfileFormValues>>['handleSubmit'];
  profileErrors: ReturnType<typeof useForm<ProfileFormValues>>['formState']['errors'];
  isProfileDirty: boolean;
  watchProfile: ReturnType<typeof useForm<ProfileFormValues>>['watch'];
  isSaving: boolean;
  onProfileSubmit: (data: ProfileFormValues) => void;
  brandCtaClass: string;
}) {
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');

  return (
    <div className='space-y-5'>
      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.account className='size-3.5' />}
          title={tAccount('organization')}
          subtitle={tAccount('orgIdentitySubtitle')}
        />
        <SurvaiPanelBody>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <Avatar className='size-20 rounded-full'>
              <AvatarFallback className='rounded-full bg-muted text-2xl font-bold text-muted-foreground'>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='font-display text-2xl  font-extrabold tracking-tight'>
                  {user.organizationName || user.fullName}
                </h3>
                <Badge className='rounded-full border-transparent bg-brand text-[10px] text-brand-foreground'>
                  {tAccount('organizationBadge')}
                </Badge>
              </div>
              <p className='text-muted-foreground text-sm'>{user.email}</p>
            </div>
          </div>
        </SurvaiPanelBody>
      </SurvaiPanel>

      <form onSubmit={handleSubmitProfile(onProfileSubmit)}>
        <SurvaiPanel>
          <SurvaiPanelHeader
            tone='brand'
            icon={<Icons.edit className='size-3.5' />}
            title={tAccount('detailsTitle')}
            subtitle={tAccount('detailsSubtitle')}
          />
          <SurvaiPanelBody className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='organizationName'>
                  {tAccount('orgName')}{' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='organizationName'
                  {...registerProfile('organizationName')}
                  className={cn(
                    'h-11 rounded-xl',
                    profileErrors.organizationName &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {profileErrors.organizationName ? (
                  <p className='text-destructive text-xs'>
                    {profileErrors.organizationName.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>{tAccount('emailAddress')}</Label>
                <Input
                  id='email'
                  value={user.email}
                  disabled
                  className='h-11 rounded-xl'
                />
                <p className='text-muted-foreground text-xs'>
                  {tAccount('emailChangeHint')}
                </p>
              </div>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='fullName'>
                  {tAccount('displayName')}{' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='fullName'
                  {...registerProfile('fullName')}
                  className={cn(
                    'h-11 rounded-xl',
                    profileErrors.fullName &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {profileErrors.fullName ? (
                  <p className='text-destructive text-xs'>
                    {profileErrors.fullName.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>{tAccount('phone')}</Label>
                <Input
                  id='phone'
                  {...registerProfile('phone')}
                  placeholder='+1 (555) 000-0000'
                  className={cn(
                    'h-11 rounded-xl',
                    profileErrors.phone &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {profileErrors.phone ? (
                  <p className='text-destructive text-xs'>
                    {profileErrors.phone.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='jobTitle'>{tAccount('focusRoleLabel')}</Label>
                <Input
                  id='jobTitle'
                  {...registerProfile('jobTitle')}
                  placeholder={tAccount('focusRolePlaceholder')}
                  className={cn(
                    'h-11 rounded-xl',
                    profileErrors.jobTitle &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {profileErrors.jobTitle ? (
                  <p className='text-destructive text-xs'>
                    {profileErrors.jobTitle.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='website'>{tAccount('website')}</Label>
                <Input
                  id='website'
                  {...registerProfile('website')}
                  placeholder='https://example.com'
                  className={cn(
                    'h-11 rounded-xl',
                    profileErrors.website &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {profileErrors.website ? (
                  <p className='text-destructive text-xs'>
                    {profileErrors.website.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='bio'>{tAccount('description')}</Label>
              <Textarea
                id='bio'
                {...registerProfile('bio')}
                placeholder={tAccount('aboutPlaceholder')}
                className={cn(
                  'min-h-[100px] rounded-xl',
                  profileErrors.bio &&
                    'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              <div className='flex items-center justify-between'>
                {profileErrors.bio ? (
                  <p className='text-destructive text-xs'>
                    {profileErrors.bio.message}
                  </p>
                ) : null}
                <p className='text-muted-foreground ml-auto font-mono text-xs tabular-nums'>
                  {watchProfile('bio')?.length || 0}/500
                </p>
              </div>
            </div>
          </SurvaiPanelBody>
          <SurvaiPanelFooter className='flex items-center justify-between gap-3'>
            {isProfileDirty ? (
              <p className='text-muted-foreground text-xs'>
                {tAccount('unsavedChanges')}
              </p>
            ) : (
              <span />
            )}
            <Button
              type='submit'
              disabled={!isProfileDirty || isSaving}
              className={brandCtaClass}
            >
              {isSaving ? (
                <>
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                  {tCommon('saving')}
                </>
              ) : (
                tAccount('saveChanges')
              )}
            </Button>
          </SurvaiPanelFooter>
        </SurvaiPanel>
      </form>
    </div>
  );
}

function SecuritySection({
  registerPassword,
  handleSubmitPassword,
  passwordErrors,
  isPasswordDirty,
  isChangingPassword,
  newPasswordValue,
  passwordStrength,
  onPasswordSubmit,
  brandCtaClass
}: {
  registerPassword: ReturnType<typeof useForm<PasswordFormValues>>['register'];
  handleSubmitPassword: ReturnType<typeof useForm<PasswordFormValues>>['handleSubmit'];
  passwordErrors: ReturnType<typeof useForm<PasswordFormValues>>['formState']['errors'];
  isPasswordDirty: boolean;
  isChangingPassword: boolean;
  newPasswordValue: string;
  passwordStrength: { score: number; label: string; color: string };
  onPasswordSubmit: (data: PasswordFormValues) => void;
  brandCtaClass: string;
}) {
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');

  return (
    <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          icon={<Icons.lock className='size-3.5' />}
          title={tAccount('changePassword')}
          subtitle={tAccount('keepAccountSecure')}
        />
        <SurvaiPanelBody className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='currentPassword'>{tAccount('currentPassword')}</Label>
            <PasswordInput
              id='currentPassword'
              autoComplete='current-password'
              {...registerPassword('currentPassword')}
              className={cn(
                'border-input bg-transparent h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                passwordErrors.currentPassword &&
                  'border-destructive focus-visible:ring-destructive/20'
              )}
            />
            {passwordErrors.currentPassword ? (
              <p className='text-destructive text-xs'>
                {passwordErrors.currentPassword.message}
              </p>
            ) : null}
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='newPassword'>{tAccount('newPassword')}</Label>
              <PasswordInput
                id='newPassword'
                autoComplete='new-password'
                {...registerPassword('newPassword')}
                className={cn(
                  'border-input bg-transparent h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  passwordErrors.newPassword &&
                    'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {passwordErrors.newPassword ? (
                <p className='text-destructive text-xs'>
                  {passwordErrors.newPassword.message}
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
                {...registerPassword('confirmPassword')}
                className={cn(
                  'border-input bg-transparent h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  passwordErrors.confirmPassword &&
                    'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {passwordErrors.confirmPassword ? (
                <p className='text-destructive text-xs'>
                  {passwordErrors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </div>
        </SurvaiPanelBody>
        <SurvaiPanelFooter className='flex justify-end'>
          <Button
            type='submit'
            disabled={!isPasswordDirty || isChangingPassword}
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
  );
}

function DangerSection({
  organizationName,
  isDeleting,
  onDelete
}: {
  organizationName: string;
  isDeleting: boolean;
  onDelete: () => void | Promise<void>;
}) {
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const canDelete =
    confirmName.trim().toLowerCase() === organizationName.trim().toLowerCase();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setConfirmName('');
  };

  const handleConfirmDelete = async () => {
    if (!canDelete || isDeleting) return;
    await onDelete();
    setOpen(false);
    setConfirmName('');
  };

  return (
    <SurvaiPanel className='border-destructive/30'>
      <SurvaiPanelHeader
        icon={<Icons.logout className='size-3.5' />}
        title={tAccount('dangerZone')}
        subtitle={tAccount('dangerSubtitle')}
        className='border-destructive/10 bg-destructive/5'
      />
      <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
        <div className='min-w-0'>
          <p className='text-sm font-medium'>{tAccount('deleteOrganization')}</p>
          <p className='text-muted-foreground text-xs'>
            {tAccount.rich('deleteOrganizationDesc', {
              name: organizationName,
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </p>
        </div>
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger
            render={
              <Button
                variant='outline'
                size='sm'
                disabled={isDeleting}
                className='shrink-0 rounded-xl border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive'
              />
            }
          >
            {isDeleting ? tAccount('deleting') : tAccount('deleteOrganization')}
          </AlertDialogTrigger>
          <AlertDialogContent className='gap-5 overflow-hidden p-0 sm:max-w-md'>
            <div className='space-y-5 px-5 pt-5'>
              <AlertDialogHeader className='flex flex-col items-start gap-3 text-left sm:place-items-start sm:text-left'>
                <AlertDialogMedia className='mb-0 size-11 rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/15 sm:row-span-1'>
                  <Icons.trash className='size-5' />
                </AlertDialogMedia>
                <div className='space-y-1.5'>
                  <AlertDialogTitle className='text-lg font-semibold tracking-tight'>
                    {tAccount('deleteDialogTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription className='text-pretty'>
                    {tAccount('deleteDialogDesc', { orgName: organizationName })}
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>

              <ul className='bg-destructive/5 text-muted-foreground ring-destructive/10 space-y-1.5 rounded-xl px-3.5 py-3 text-xs ring-1'>
                {(
                  [
                    tAccount('deleteBulletAccount'),
                    tAccount('deleteBulletSurveys'),
                    tAccount('deleteBulletReports')
                  ] as const
                ).map((item) => (
                  <li key={item} className='flex gap-2'>
                    <span
                      aria-hidden
                      className='bg-destructive/70 .5 size-1 shrink-0 rounded-full'
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className='space-y-2'>
                <Label
                  htmlFor='confirm-org-name'
                  className='text-muted-foreground text-xs font-normal'
                >
                  {tAccount('typeToConfirm', { orgName: organizationName })}
                </Label>
                <Input
                  id='confirm-org-name'
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  autoComplete='off'
                  spellCheck={false}
                  placeholder={organizationName}
                  className={cn(
                    'h-11 rounded-xl',
                    confirmName.length > 0 &&
                      (canDelete
                        ? 'border-destructive/50 focus-visible:ring-destructive/20'
                        : 'border-destructive/30')
                  )}
                  disabled={isDeleting}
                />
              </div>
            </div>

            <AlertDialogFooter className='mx-0 mb-0 rounded-none border-t bg-brand-soft/70 px-5 py-4'>
              <AlertDialogCancel
                disabled={isDeleting}
                className='rounded-xl'
              >
                {tCommon('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className='rounded-xl bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90 disabled:opacity-40'
                disabled={!canDelete || isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmDelete();
                }}
              >
                {isDeleting ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    {tAccount('deleting')}
                  </>
                ) : (
                  tAccount('deletePermanently')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SurvaiPanel>
  );
}
