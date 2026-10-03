'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type SettingsSection = 'general' | 'notifications' | 'security' | 'danger';

const navItems: { id: SettingsSection; label: string; icon: keyof typeof Icons }[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'notifications', label: 'Notifications', icon: 'notification' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'danger', label: 'Danger Zone', icon: 'warning' }
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold tracking-tight text-primary dark:text-whitere'>Settings</h1>
        <p className='text-muted-foreground text-sm'>
          Manage your organization settings and application preferences.
        </p>
      </div>

      <div className='flex flex-1 gap-6'>
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

        <div className='flex-1 min-w-0'>
          {activeSection === 'general' && <GeneralSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'danger' && <DangerZone />}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const { user } = useAuth();

  return (
    <div className='space-y-6 max-w-2xl'>
      <section>
        <h2 className='text-lg font-semibold text-primary'>Organization</h2>
        <p className='text-muted-foreground mt-1 text-sm'>Basic information about your organization.</p>
        <div className='mt-4 rounded-xl border'>
          <div className='space-y-4 p-6'>
            <div className='space-y-2'>
              <Label htmlFor='org-name'>Organization Name</Label>
              <Input id='org-name' defaultValue={user?.organizationName || ''} placeholder='Your organization name' className='h-11 max-w-md' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='org-description'>Description</Label>
              <Textarea id='org-description' placeholder='Describe your organization...' className='min-h-[80px] max-w-lg' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='org-website'>Website</Label>
              <Input id='org-website' placeholder='https://example.com' className='h-11 max-w-md' />
            </div>
          </div>
          <div className='border-t px-6 py-4'>
            <div className='flex justify-end'>
              <Button>Save Changes</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className='space-y-6 max-w-2xl'>
      <section>
        <h2 className='text-lg font-semibold text-primary'>Email Notifications</h2>
        <p className='text-muted-foreground mt-1 text-sm'>Choose which email notifications you&apos;d like to receive.</p>
        <div className='mt-4 rounded-xl border divide-y'>
          <NotificationRow title='Survey Responses' description='Get notified when respondents complete your surveys.' defaultChecked />
          <NotificationRow title='AI Review Complete' description='Notification when AI finishes reviewing a survey.' defaultChecked />
          <NotificationRow title='Report Generated' description='Alert when AI-generated reports are ready.' defaultChecked />
          <NotificationRow title='Weekly Digest' description="Summary of your organization's survey activity." />
          <NotificationRow title='Billing Alerts' description='Important updates about your subscription.' defaultChecked />
        </div>
      </section>
    </div>
  );
}

function NotificationRow({ title, description, defaultChecked = false }: { title: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className='flex items-center justify-between px-6 py-4'>
      <div className='space-y-0.5'>
        <p className='font-medium text-sm'>{title}</p>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className='space-y-6 max-w-2xl'>
      <section>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-primary'>Two-Factor Authentication</h2>
            <p className='text-muted-foreground mt-1 text-sm'>Add an extra layer of security to your account.</p>
          </div>
          <Badge variant='outline'>Not Enabled</Badge>
        </div>
        <div className='mt-4 rounded-xl border divide-y'>
          <div className='flex items-center justify-between px-6 py-4'>
            <div className='space-y-0.5'>
              <p className='font-medium text-sm'>Authenticator App</p>
              <p className='text-muted-foreground text-sm'>Use an authenticator app to generate one-time codes.</p>
            </div>
            <Switch />
          </div>
          <div className='flex items-center justify-between px-6 py-4'>
            <div className='space-y-0.5'>
              <p className='font-medium text-sm'>SMS Recovery</p>
              <p className='text-muted-foreground text-sm'>Use your phone number as a backup verification method.</p>
            </div>
            <Switch />
          </div>
        </div>
      </section>

      <section>
        <h2 className='text-lg font-semibold text-primary'>Active Sessions</h2>
        <p className='text-muted-foreground mt-1 text-sm'>Devices where you&apos;re currently signed in.</p>
        <div className='mt-4 rounded-xl border divide-y'>
          <SessionRow icon={<Icons.laptop className='size-4' />} device='MacBook Pro — Chrome' location='San Francisco, US' lastActive='Current session' isCurrent />
          <SessionRow icon={<Icons.phone className='size-4' />} device='iPhone 15 — Safari' location='San Francisco, US' lastActive='2 hours ago' />
        </div>
        <div className='flex justify-start mt-4'>
          <Button variant='outline'>
            <Icons.logout className='mr-2 size-4' />
            Sign Out All Other Sessions
          </Button>
        </div>
      </section>
    </div>
  );
}

function SessionRow({ icon, device, location, lastActive, isCurrent = false }: { icon: React.ReactNode; device: string; location: string; lastActive: string; isCurrent?: boolean }) {
  return (
    <div className='flex items-center justify-between px-6 py-4'>
      <div className='flex items-center gap-3'>
        <div className='text-muted-foreground'>{icon}</div>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2'>
            <p className='font-medium text-sm'>{device}</p>
            {isCurrent && <Badge variant='default' className='text-[10px]'>Current</Badge>}
          </div>
          <p className='text-muted-foreground text-xs'>{location} · {lastActive}</p>
        </div>
      </div>
      {!isCurrent && (
        <Button variant='ghost' size='sm' className='text-muted-foreground hover:text-destructive'>Revoke</Button>
      )}
    </div>
  );
}

function DangerZone() {
  return (
    <div className='space-y-6 max-w-2xl'>
      <section>
        <h2 className='text-lg font-semibold text-destructive'>Danger Zone</h2>
        <p className='text-muted-foreground mt-1 text-sm'>Irreversible actions for your organization.</p>
        <div className='mt-4 rounded-xl border border-destructive/30 divide-y divide-destructive/20'>
          <div className='flex items-center justify-between px-6 py-4'>
            <div>
              <p className='font-medium text-sm'>Delete Organization</p>
              <p className='text-muted-foreground text-xs'>Permanently delete this organization and all its data.</p>
            </div>
            <Button variant='destructive' size='sm'>Delete Organization</Button>
          </div>
          <div className='flex items-center justify-between px-6 py-4'>
            <div>
              <p className='font-medium text-sm'>Leave Organization</p>
              <p className='text-muted-foreground text-xs'>Remove yourself from this organization.</p>
            </div>
            <Button variant='outline' size='sm' className='text-destructive border-destructive/30 hover:bg-destructive/5'>Leave</Button>
          </div>
          <div className='flex items-center justify-between px-6 py-4'>
            <div>
              <p className='font-medium text-sm'>Transfer Ownership</p>
              <p className='text-muted-foreground text-xs'>Transfer ownership to another member.</p>
            </div>
            <Button variant='outline' size='sm'>Transfer</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
