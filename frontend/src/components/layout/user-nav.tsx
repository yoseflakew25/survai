'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { Icons } from '@/components/icons';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';

export function UserNav() {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const signingOut = busy || isLoggingOut;

  async function handleSignOut() {
    if (signingOut) return;
    setBusy(true);
    try {
      await logout();
      toast.success('Signed out', {
        description: 'See you next time.'
      });
    } catch {
      toast.error('Could not sign out', {
        description: 'Try again in a moment.'
      });
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            className='relative h-8 w-8 rounded-full'
            disabled={signingOut}
          />
        }
      >
        <UserAvatarProfile
          user={{
            fullName: user.fullName,
            emailAddresses: [{ emailAddress: user.email }],
            imageUrl: ''
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' sideOffset={10}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>{user.fullName}</p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={signingOut}
            onClick={() => router.push('/dashboard/profile')}
          >
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={signingOut}
            variant='destructive'
            onClick={() => void handleSignOut()}
          >
            {signingOut ? (
              <Icons.spinner className='mr-2 size-4 animate-spin' />
            ) : (
              <Icons.logout className='mr-2 size-4' />
            )}
            {signingOut ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
