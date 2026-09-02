'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { useState } from 'react';

export function SettingsSecurity() {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className='space-y-6'>
      {/* Two-Factor Authentication */}
      <div className='rounded-xl border bg-card'>
        <div className='border-b px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-semibold'>Two-Factor Authentication</h3>
              <p className='text-muted-foreground mt-0.5 text-sm'>
                Add an extra layer of security to your account.
              </p>
            </div>
            <Badge variant='outline' className='text-muted-foreground'>
              Not Enabled
            </Badge>
          </div>
        </div>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='space-y-0.5'>
            <p className='font-medium text-sm'>Authenticator App</p>
            <p className='text-muted-foreground text-sm'>
              Use an authenticator app to generate one-time codes.
            </p>
          </div>
          <Switch />
        </div>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='space-y-0.5'>
            <p className='font-medium text-sm'>SMS Recovery</p>
            <p className='text-muted-foreground text-sm'>
              Use your phone number as a backup verification method.
            </p>
          </div>
          <Switch />
        </div>
      </div>

      {/* Active Sessions */}
      <div className='rounded-xl border bg-card'>
        <div className='border-b px-6 py-4'>
          <h3 className='font-semibold'>Active Sessions</h3>
          <p className='text-muted-foreground mt-0.5 text-sm'>
            Devices where you&apos;re currently signed in.
          </p>
        </div>
        <div className='divide-y'>
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
        <div className='border-t px-6 py-4'>
          <Button variant='outline' size='sm'>
            <Icons.logout className='mr-2 size-4' />
            Sign Out All Other Sessions
          </Button>
        </div>
      </div>

      {/* API Keys */}
      <div className='rounded-xl border bg-card'>
        <div className='border-b px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-semibold'>API Keys</h3>
              <p className='text-muted-foreground mt-0.5 text-sm'>
                Manage API keys for programmatic access.
              </p>
            </div>
            <Button variant='outline' size='sm'>
              <Icons.add className='mr-2 size-4' />
              Generate Key
            </Button>
          </div>
        </div>
        <div className='px-6 py-4'>
          <div className='rounded-lg bg-muted/50 p-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <p className='font-medium text-sm'>Production Key</p>
                <div className='flex items-center gap-2'>
                  <code className='bg-muted text-foreground rounded px-2 py-0.5 font-mono text-xs'>
                    {showApiKey ? 'sk_live_abc123def456ghi789jkl012mno345' : 'sk_live_••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className='text-muted-foreground hover:text-foreground transition-colors'
                  >
                    {showApiKey ? (
                      <Icons.eyeOff className='size-3.5' />
                    ) : (
                      <Icons.review className='size-3.5' />
                    )}
                  </button>
                </div>
              </div>
              <Button variant='ghost' size='sm'>
                <Icons.trash className='size-4' />
              </Button>
            </div>
            <p className='text-muted-foreground mt-2 text-xs'>
              Created 3 days ago · Last used today
            </p>
          </div>
        </div>
      </div>
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
    <div className='flex items-center justify-between px-6 py-4'>
      <div className='flex items-center gap-3'>
        <div className='text-muted-foreground'>{icon}</div>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2'>
            <p className='font-medium text-sm'>{device}</p>
            {isCurrent && (
              <Badge variant='default' className='text-[10px]'>
                Current
              </Badge>
            )}
          </div>
          <p className='text-muted-foreground text-xs'>
            {location} · {lastActive}
          </p>
        </div>
      </div>
      {!isCurrent && (
        <Button variant='ghost' size='sm' className='text-muted-foreground hover:text-destructive'>
          Revoke
        </Button>
      )}
    </div>
  );
}
