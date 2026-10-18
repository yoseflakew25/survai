'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader
} from '@/components/survai-panel';

type SettingsSection = 'general' | 'notifications' | 'security' | 'danger';

const navItems: {
  id: SettingsSection;
  label: string;
  icon: keyof typeof Icons;
}[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'notifications', label: 'Notifications', icon: 'notification' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'danger', label: 'Danger Zone', icon: 'warning' }
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-8 md:px-6 md:pt-4'>
      <header className='mb-6'>
        <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
          Settings
        </h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Organization preferences and account controls.
        </p>
      </header>

      <div
        role='tablist'
        aria-label='Settings sections'
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
                isActive &&
                  !isDanger &&
                  'bg-card text-foreground shadow-sm',
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
        {activeSection === 'general' && <GeneralSettings />}
        {activeSection === 'notifications' && <NotificationSettings />}
        {activeSection === 'security' && <SecuritySettings />}
        {activeSection === 'danger' && <DangerZone />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  const { user } = useAuth();

  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        icon={<Icons.settings className='size-3.5' />}
        title='Organization'
        subtitle='Basic information about your organization.'
      />
      <SurvaiPanelBody className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='org-name'>Organization Name</Label>
          <Input
            id='org-name'
            defaultValue={user?.organizationName || ''}
            placeholder='Your organization name'
            className='h-11'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='org-description'>Description</Label>
          <Textarea
            id='org-description'
            placeholder='Describe your organization...'
            className='min-h-[88px]'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='org-website'>Website</Label>
          <Input
            id='org-website'
            placeholder='https://example.com'
            className='h-11'
          />
        </div>
      </SurvaiPanelBody>
      <SurvaiPanelFooter className='flex justify-end'>
        <Button>Save Changes</Button>
      </SurvaiPanelFooter>
    </SurvaiPanel>
  );
}

function NotificationSettings() {
  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        icon={<Icons.notification className='size-3.5' />}
        title='Email Notifications'
        subtitle="Choose which email notifications you'd like to receive."
      />
      <div className='divide-y divide-border'>
        <NotificationRow
          title='Survey Responses'
          description='Get notified when respondents complete your surveys.'
          defaultChecked
        />
        <NotificationRow
          title='AI Review Complete'
          description='Notification when AI finishes reviewing a survey.'
          defaultChecked
        />
        <NotificationRow
          title='Report Generated'
          description='Alert when AI-generated reports are ready.'
          defaultChecked
        />
        <NotificationRow
          title='Weekly Digest'
          description="Summary of your organization's survey activity."
        />
        <NotificationRow
          title='Billing Alerts'
          description='Important updates about your subscription.'
          defaultChecked
        />
      </div>
    </SurvaiPanel>
  );
}

function NotificationRow({
  title,
  description,
  defaultChecked = false
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className='flex items-center justify-between gap-4 px-4 py-4 sm:px-5'>
      <div className='min-w-0 space-y-0.5'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className='space-y-5'>
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.lock className='size-3.5' />}
          title='Two-Factor Authentication'
          subtitle='Add an extra layer of security to your account.'
          badge={<Badge variant='outline'>Not Enabled</Badge>}
        />
        <div className='divide-y divide-border'>
          <div className='flex items-center justify-between gap-4 px-4 py-4 sm:px-5'>
            <div className='min-w-0 space-y-0.5'>
              <p className='text-sm font-medium'>Authenticator App</p>
              <p className='text-muted-foreground text-sm'>
                Use an authenticator app to generate one-time codes.
              </p>
            </div>
            <Switch />
          </div>
          <div className='flex items-center justify-between gap-4 px-4 py-4 sm:px-5'>
            <div className='min-w-0 space-y-0.5'>
              <p className='text-sm font-medium'>SMS Recovery</p>
              <p className='text-muted-foreground text-sm'>
                Use your phone number as a backup verification method.
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </SurvaiPanel>

      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.laptop className='size-3.5' />}
          title='Active Sessions'
          subtitle="Devices where you're currently signed in."
        />
        <div className='divide-y divide-border'>
          <SessionRow
            icon={<Icons.laptop className='size-4' />}
            device='MacBook Pro — Chrome'
            location='San Francisco, US'
            lastActive='Current session'
            isCurrent
          />
          <SessionRow
            icon={<Icons.phone className='size-4' />}
            device='iPhone 15 — Safari'
            location='San Francisco, US'
            lastActive='2 hours ago'
          />
        </div>
        <SurvaiPanelFooter>
          <Button variant='outline' size='sm'>
            <Icons.logout className='mr-2 size-4' />
            Sign Out All Other Sessions
          </Button>
        </SurvaiPanelFooter>
      </SurvaiPanel>
    </div>
  );
}

function SessionRow({
  icon,
  device,
  location,
  lastActive,
  isCurrent = false
}: {
  icon: React.ReactNode;
  device: string;
  location: string;
  lastActive: string;
  isCurrent?: boolean;
}) {
  return (
    <div className='flex items-center justify-between gap-4 px-4 py-4 sm:px-5'>
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
          {icon}
        </div>
        <div className='min-w-0 space-y-0.5'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-medium'>{device}</p>
            {isCurrent ? (
              <Badge className='bg-brand text-brand-foreground border-transparent text-[10px]'>
                Current
              </Badge>
            ) : null}
          </div>
          <p className='text-muted-foreground text-xs'>
            {location} · {lastActive}
          </p>
        </div>
      </div>
      {!isCurrent ? (
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground shrink-0 hover:text-destructive'
        >
          Revoke
        </Button>
      ) : null}
    </div>
  );
}

function DangerZone() {
  return (
    <SurvaiPanel className='border-destructive/30'>
      <SurvaiPanelHeader
        icon={<Icons.warning className='size-3.5' />}
        title='Danger Zone'
        subtitle='Irreversible actions for your organization.'
        className='bg-destructive/5'
      />
      <div className='divide-y divide-destructive/15'>
        <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
          <div>
            <p className='text-sm font-medium'>Delete Organization</p>
            <p className='text-muted-foreground text-xs'>
              Permanently delete this organization and all its data.
            </p>
          </div>
          <Button variant='destructive' size='sm' className='shrink-0'>
            Delete Organization
          </Button>
        </div>
        <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
          <div>
            <p className='text-sm font-medium'>Leave Organization</p>
            <p className='text-muted-foreground text-xs'>
              Remove yourself from this organization.
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='border-destructive/30 text-destructive shrink-0 hover:bg-destructive/5'
          >
            Leave
          </Button>
        </div>
        <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
          <div>
            <p className='text-sm font-medium'>Transfer Ownership</p>
            <p className='text-muted-foreground text-xs'>
              Transfer ownership to another member.
            </p>
          </div>
          <Button variant='outline' size='sm' className='shrink-0'>
            Transfer
          </Button>
        </div>
      </div>
    </SurvaiPanel>
  );
}
