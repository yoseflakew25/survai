'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { AvatarUpload } from './avatar-upload';
import { RecentActivity } from './recent-activity';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader
} from '@/components/survai-panel';

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-()]{7,20}$/.test(val), {
      message: 'Please enter a valid phone number'
    }),
  jobTitle: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 100, {
      message: 'Job title must be at most 100 characters'
    }),
  bio: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 500, {
      message: 'Bio must be at most 500 characters'
    })
});

type ProfileFormValues = z.infer<typeof profileSchema>;

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

type ProfileSection = 'profile' | 'activity' | 'security' | 'danger';

const navItems: { id: ProfileSection; label: string; icon: keyof typeof Icons }[] = [
  { id: 'profile', label: 'Profile', icon: 'account' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'danger', label: 'Danger Zone', icon: 'warning' }
];

export default function ProfileViewPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
    watch: watchProfile
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: '',
      jobTitle: '',
      bio: ''
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

  const newPasswordValue = watchPassword('newPassword');

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-success' };
    return { score, label: 'Strong', color: 'bg-primary' };
  };

  const passwordStrength = getPasswordStrength(newPasswordValue || '');

  if (!user) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <p className='text-muted-foreground'>Not signed in.</p>
      </div>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsChangingPassword(false);
    resetPassword();
  };

  const brandCtaClass =
    'h-10 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-[filter,box-shadow] hover:brightness-105 disabled:opacity-50';

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-8 md:px-6 md:pt-4'>
      <header className='mb-6'>
        <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
          Profile
        </h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Personal information and account security.
        </p>
      </header>

      <div
        role='tablist'
        aria-label='Profile sections'
        className='mb-6 flex flex-wrap gap-1 rounded-full bg-secondary p-1'
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
            avatarImage={avatarImage}
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

        {activeSection === 'activity' && <RecentActivity />}
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
        {activeSection === 'danger' && <DangerSection />}
      </div>
    </div>
  );
}

// ── Profile Section ──────────────────────────────────────────────

function ProfileSection({
  user,
  initials,
  avatarImage,
  registerProfile,
  handleSubmitProfile,
  profileErrors,
  isProfileDirty,
  watchProfile,
  isSaving,
  onProfileSubmit,
  brandCtaClass
}: {
  user: { fullName: string; email: string };
  initials: string;
  avatarImage: string | null;
  registerProfile: ReturnType<typeof useForm<ProfileFormValues>>['register'];
  handleSubmitProfile: ReturnType<typeof useForm<ProfileFormValues>>['handleSubmit'];
  profileErrors: ReturnType<typeof useForm<ProfileFormValues>>['formState']['errors'];
  isProfileDirty: boolean;
  watchProfile: ReturnType<typeof useForm<ProfileFormValues>>['watch'];
  isSaving: boolean;
  onProfileSubmit: (data: ProfileFormValues) => void;
  brandCtaClass: string;
}) {
  return (
    <div className='space-y-5'>
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.account className='size-3.5' />}
          title='Personal Information'
          subtitle='Update your profile photo and personal details.'
        />
        <SurvaiPanelBody>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <AvatarUpload
              initials={initials}
              currentImage={avatarImage}
              onImageChange={() => {}}
            />
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='font-display text-lg font-extrabold tracking-tight'>
                  {user.fullName}
                </h3>
                <Badge className='rounded-full border-transparent bg-brand text-[10px] text-brand-foreground'>
                  User
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
            icon={<Icons.edit className='size-3.5' />}
            title='Details'
            subtitle='Name, contact, and bio.'
          />
          <SurvaiPanelBody className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='fullName'>
                  Full Name <span className='text-destructive'>*</span>
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
                <Label htmlFor='email'>Email Address</Label>
                <Input
                  id='email'
                  value={user.email}
                  disabled
                  className='h-11 rounded-xl'
                />
                <p className='text-muted-foreground text-xs'>
                  Contact support to change your email
                </p>
              </div>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='phone'>Phone Number</Label>
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
              <div className='space-y-2'>
                <Label htmlFor='jobTitle'>Job Title</Label>
                <Input
                  id='jobTitle'
                  {...registerProfile('jobTitle')}
                  placeholder='e.g. Research Director'
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
            </div>
            <div className='space-y-2'>
              <Label htmlFor='bio'>Bio</Label>
              <Textarea
                id='bio'
                {...registerProfile('bio')}
                placeholder='Tell us a little about yourself...'
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
                You have unsaved changes
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
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </SurvaiPanelFooter>
        </SurvaiPanel>
      </form>
    </div>
  );
}

// ── Security Section ─────────────────────────────────────────────

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
  return (
    <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.lock className='size-3.5' />}
          title='Change Password'
          subtitle='Ensure your account stays secure with a strong password.'
        />
        <SurvaiPanelBody className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='currentPassword'>Current Password</Label>
            <Input
              id='currentPassword'
              type='password'
              {...registerPassword('currentPassword')}
              className={cn(
                'h-11 rounded-xl',
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
              <Label htmlFor='newPassword'>New Password</Label>
              <Input
                id='newPassword'
                type='password'
                {...registerPassword('newPassword')}
                className={cn(
                  'h-11 rounded-xl',
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
                    {passwordStrength.label} — use 8+ characters with upper,
                    lower, and numbers
                  </p>
                </div>
              ) : null}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm New Password</Label>
              <Input
                id='confirmPassword'
                type='password'
                {...registerPassword('confirmPassword')}
                className={cn(
                  'h-11 rounded-xl',
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
                Updating…
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </SurvaiPanelFooter>
      </SurvaiPanel>
    </form>
  );
}

// ── Danger Section ───────────────────────────────────────────────

function DangerSection() {
  return (
    <SurvaiPanel className='border-destructive/30'>
      <SurvaiPanelHeader
        icon={<Icons.warning className='size-3.5' />}
        title='Danger Zone'
        subtitle='Irreversible actions for your account.'
        className='bg-destructive/5'
      />
      <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
        <div>
          <p className='text-sm font-medium'>Delete Account</p>
          <p className='text-muted-foreground text-xs'>
            Permanently delete your account and all associated data.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant='destructive' size='sm' className='shrink-0 rounded-xl' />
            }
          >
            Delete Account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all your data including surveys, responses,
                and reports.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SurvaiPanel>
  );
}
