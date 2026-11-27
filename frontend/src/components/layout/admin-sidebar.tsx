'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { adminNavGroups } from '@/config/admin-nav-config';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Icons } from '../icons';
import {
  isNavActive,
  SidebarActiveBar,
  SidebarBrandHeader,
  SidebarNavIcon,
  SidebarUserAvatar,
  SidebarUserTriggerMeta,
  sidebarUserTriggerClass
} from './sidebar-shared';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const { isMobile } = useSidebar();

  return (
    <Sidebar collapsible='icon'>
      <SidebarBrandHeader href='/admin/overview' ariaLabel='Survai Admin' badge='Admin' />

      <SidebarContent className='overflow-x-hidden pt-2'>
        {adminNavGroups.map((group, groupIndex) => (
          <SidebarGroup
            key={group.label || `group-${groupIndex}`}
            className={cn(groupIndex > 0 && 'mt-1 border-t border-foreground/[0.08] pt-3')}
          >
            {group.label ? (
              <SidebarGroupLabel className='mb-1.5'>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarMenu>
              {group.items.map((item) => {
                const IconComponent = item.icon
                  ? (Icons[item.icon] as ComponentType<React.SVGProps<SVGSVGElement>>)
                  : null;
                const active = isNavActive(pathname, item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={active}
                    >
                      <SidebarActiveBar isActive={active} />
                      <SidebarNavIcon icon={IconComponent} isActive={active} />
                      <span className='flex-1 group-data-[collapsible=icon]:hidden'>
                        {item.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size='lg' className={sidebarUserTriggerClass} />}
              >
                <SidebarUserAvatar name={user?.fullName} fallback='A' />
                <SidebarUserTriggerMeta title={user?.fullName || 'Admin'} subtitle='System admin' />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-60 rounded-none border-foreground/20'
                side={isMobile ? 'top' : 'right'}
                align='end'
                sideOffset={8}
              >
                <div className='flex items-center gap-2.5 border-b border-foreground/[0.08] bg-brand-soft/35 p-2.5'>
                  <SidebarUserAvatar name={user?.fullName} fallback='A' size='md' />
                  <div className='min-w-0 flex-1 text-left leading-tight'>
                    <span className='block truncate text-sm font-semibold tracking-tight text-foreground'>
                      {user?.fullName || 'Admin'}
                    </span>
                    <span className='block truncate font-mono text-[11px] text-muted-foreground'>
                      System admin
                    </span>
                  </div>
                </div>
                <DropdownMenuGroup className='pt-1'>
                  <DropdownMenuItem
                    className='rounded-none'
                    onClick={() => router.push('/dashboard/overview')}
                  >
                    Org workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='rounded-none'
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    Profile
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='rounded-none'
                  variant='destructive'
                  disabled={isLoggingOut}
                  onClick={async () => {
                    try {
                      await logout();
                      router.replace('/auth/sign-in');
                    } catch {
                      toast.error('Could not sign out');
                    }
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
