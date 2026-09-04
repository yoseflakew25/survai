'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export function SettingsNotifications() {
  return (
    <div className='space-y-4'>
      {/* Email Notifications */}
      <div className='rounded-xl border bg-card'>
        <div className='border-b px-6 py-4'>
          <h3 className='font-semibold'>Email Notifications</h3>
          <p className='text-muted-foreground mt-0.5 text-sm'>
            Choose which email notifications you&apos;d like to receive.
          </p>
        </div>
        <div className='divide-y'>
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
            description='Important updates about your subscription and usage.'
            defaultChecked
          />
        </div>
      </div>

      {/* In-App Notifications */}
      <div className='rounded-xl border bg-card'>
        <div className='border-b px-6 py-4'>
          <h3 className='font-semibold'>In-App Notifications</h3>
          <p className='text-muted-foreground mt-0.5 text-sm'>
            Control notifications within the application.
          </p>
        </div>
        <div className='divide-y'>
          <NotificationRow
            title='Browser Notifications'
            description='Show browser push notifications for important events.'
          />
          <NotificationRow
            title='Survey Activity Feed'
            description='Show real-time activity in the notification center.'
            defaultChecked
          />
          <NotificationRow
            title='Team Updates'
            description='Notifications when team members make changes.'
            defaultChecked
          />
        </div>
        <div className='border-t px-6 py-4'>
          <div className='flex justify-end'>
            <Button>Save Preferences</Button>
          </div>
        </div>
      </div>
    </div>
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
    <div className='flex items-center justify-between px-6 py-4'>
      <div className='space-y-0.5'>
        <p className='font-medium text-sm'>{title}</p>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
