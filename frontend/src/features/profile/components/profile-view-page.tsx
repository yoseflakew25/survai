'use client';

import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
    if (score <= 4) return { score, label: 'Good', color: 'bg-emerald-500' };
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

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold tracking-tight text-primary'>Profile</h1>
        <p className='text-muted-foreground text-sm'>
          Manage your personal information and account settings.
        </p>
      </div>

      <div className='flex flex-1 gap-6'>
        {/* Sidebar Nav */}
        <nav className='w-48 shrink-0'>
          <div className='space-y-1'>
            {navItems.map((item) => {
              const Icon = Icons[item.icon];
              const isActive = activeSection === item.id;
              const isDanger = item.id === 'danger';
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    isDanger && !isActive && 'hover:text-destructive hover:bg-destructive/5',
                    isDanger && isActive && 'bg-destructive/10 text-destructive'
                  )}
                >
                  <Icon className='size-5' />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <Separator orientation='vertical' className='h-auto' />

        {/* Content */}
        <div className='flex-1 min-w-0'>
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
            />
          )}
          {activeSection === 'danger' && <DangerSection />}
        </div>
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
  onProfileSubmit
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
}) {
  return (
    <div className='space-y-6 max-w-2xl'>
      {/* Avatar Card */}
      <section>
        <h2 className='text-lg font-semibold text-primary'>Personal Information</h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Update your profile photo and personal details.
        </p>
        <div className='mt-4 rounded-xl border'>
          <div className='flex flex-col gap-6 p-6 sm:flex-row sm:items-start'>
            <AvatarUpload initials={initials} currentImage={avatarImage} onImageChange={() => {}} />
            <div className='flex-1 space-y-4'>
              <div className='flex items-center gap-3'>
                <h3 className='text-xl font-semibold'>{user.fullName}</h3>
                <Badge variant='default' className='capitalize'>
                  User
                </Badge>
              </div>
              <p className='text-muted-foreground text-sm'>{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Fields */}
      <form onSubmit={handleSubmitProfile(onProfileSubmit)} className='rounded-xl border'>
        <div className='space-y-4 p-6'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='fullName'>
                Full Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='fullName'
                {...registerProfile('fullName')}
                className={cn(
                  'h-11',
                  profileErrors.fullName && 'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {profileErrors.fullName && (
                <p className='text-destructive text-xs'>{profileErrors.fullName.message}</p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email Address</Label>
              <Input id='email' value={user.email} disabled className='h-11' />
              <p className='text-muted-foreground text-xs'>Contact support to change your email</p>
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
                  'h-11',
                  profileErrors.phone && 'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {profileErrors.phone && (
                <p className='text-destructive text-xs'>{profileErrors.phone.message}</p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='jobTitle'>Job Title</Label>
              <Input
                id='jobTitle'
                {...registerProfile('jobTitle')}
                placeholder='e.g. Research Director'
                className={cn(
                  'h-11',
                  profileErrors.jobTitle && 'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {profileErrors.jobTitle && (
                <p className='text-destructive text-xs'>{profileErrors.jobTitle.message}</p>
              )}
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='bio'>Bio</Label>
            <Textarea
              id='bio'
              {...registerProfile('bio')}
              placeholder='Tell us a little about yourself...'
              className={cn(
                'min-h-[100px]',
                profileErrors.bio && 'border-destructive focus-visible:ring-destructive/20'
              )}
            />
            <div className='flex items-center justify-between'>
              {profileErrors.bio && (
                <p className='text-destructive text-xs'>{profileErrors.bio.message}</p>
              )}
              <p className='text-muted-foreground ml-auto text-xs'>
                {watchProfile('bio')?.length || 0}/500
              </p>
            </div>
          </div>
        </div>
        <div className='border-t px-6 py-4'>
          <div className='flex items-center justify-between'>
            {isProfileDirty && (
              <p className='text-muted-foreground text-xs'>You have unsaved changes</p>
            )}
            <div className='ml-auto'>
              <Button type='submit' disabled={!isProfileDirty || isSaving}>
                {isSaving ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
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
  onPasswordSubmit
}: {
  registerPassword: ReturnType<typeof useForm<PasswordFormValues>>['register'];
  handleSubmitPassword: ReturnType<typeof useForm<PasswordFormValues>>['handleSubmit'];
  passwordErrors: ReturnType<typeof useForm<PasswordFormValues>>['formState']['errors'];
  isPasswordDirty: boolean;
  isChangingPassword: boolean;
  newPasswordValue: string;
  passwordStrength: { score: number; label: string; color: string };
  onPasswordSubmit: (data: PasswordFormValues) => void;
}) {
  return (
    <div className='space-y-6 max-w-2xl'>
      <section>
        <h2 className='text-lg font-semibold text-primary'>Change Password</h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Ensure your account stays secure with a strong password.
        </p>
        <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className='mt-4 rounded-xl border'>
          <div className='space-y-4 p-6'>
            <div className='space-y-2'>
              <Label htmlFor='currentPassword'>Current Password</Label>
              <Input
                id='currentPassword'
                type='password'
                {...registerPassword('currentPassword')}
                className={cn(
                  'h-11 max-w-md',
                  passwordErrors.currentPassword &&
                    'border-destructive focus-visible:ring-destructive/20'
                )}
              />
              {passwordErrors.currentPassword && (
                <p className='text-destructive text-xs'>
                  {passwordErrors.currentPassword.message}
                </p>
              )}
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='newPassword'>New Password</Label>
                <Input
                  id='newPassword'
                  type='password'
                  {...registerPassword('newPassword')}
                  className={cn(
                    'h-11',
                    passwordErrors.newPassword &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {passwordErrors.newPassword && (
                  <p className='text-destructive text-xs'>{passwordErrors.newPassword.message}</p>
                )}
                {newPasswordValue && (
                  <div >
                    <div className='flex gap-1'>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            i <= passwordStrength.score ? passwordStrength.color : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                    <p className='text-muted-foreground text-xs'>
                      {passwordStrength.label} — use 8+ characters with upper, lower, and numbers
                    </p>
                  </div>
                )}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Confirm New Password</Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  {...registerPassword('confirmPassword')}
                  className={cn(
                    'h-11',
                    passwordErrors.confirmPassword &&
                      'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {passwordErrors.confirmPassword && (
                  <p className='text-destructive text-xs'>
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className='border-t px-6 py-4'>
            <div className='flex justify-end'>
              <Button
                type='submit'
                variant='outline'
                disabled={!isPasswordDirty || isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

// ── Danger Section ───────────────────────────────────────────────

function DangerSection() {
  return (
    <div className='space-y-6 max-w-2xl'>
      <section>
        <h2 className='text-lg font-semibold text-destructive'>Danger Zone</h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Irreversible actions for your account.
        </p>
        <div className='mt-4 rounded-xl border border-destructive/30 divide-y divide-destructive/20'>
          <div className='flex items-center justify-between px-6 py-4'>
            <div>
              <p className='font-medium text-sm'>Delete Account</p>
              <p className='text-muted-foreground text-xs'>
                Permanently delete your account and all associated data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant='destructive' size='sm' />}>
                Delete Account
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove
                    all your data including surveys, responses, and reports.
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
        </div>
      </section>
    </div>
  );
}
