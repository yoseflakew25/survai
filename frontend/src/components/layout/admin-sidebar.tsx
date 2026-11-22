'use client';

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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import type { ComponentType } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { adminNavGroups } from '@/config/admin-nav-config';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '../icons';
import { SurvaiLogo, SurvaiMark } from '@/components/survai-logo';

function isNavActive(pathname: string, href: string): boolean {
  if (!href || href === '#') return false;
  if (pathname === href) return true;
  const base = href.endsWith('/') ? href.slice(0, -1) : href;
  return pathname.startsWith(`${base}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='flex h-[var(--header-height)] shrink-0 justify-center border-b border-sidebar-border px-2 group-data-[collapsible=icon]:px-0'>
        <SidebarMenu className='w-full justify-center'>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='h-full w-full justify-start px-2.5 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'
              onClick={() => router.push('/admin/overview')}
              aria-label='Survai Admin'
            >
              {isCollapsed ? (
                <SurvaiMark className='mx-auto size-9' />
              ) : (
                <div className='flex min-w-0 flex-col items-start gap-0.5'>
                  <SurvaiLogo
                    className='w-full justify-start text-[1.85rem] font-bold leading-none tracking-[-0.06em] text-foreground md:text-[1.75rem]'
                  />
                  <span className='rounded-none bg-brand-soft px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-foreground'>
                    Admin
                  </span>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className='overflow-x-hidden px-1.5 pt-3'>
        {adminNavGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-1'>
            {group.label ? (
              <p className='mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden'>
                {group.label}
              </p>
            ) : null}
            <SidebarMenu>
              {group.items.map((item) => {
                const IconComponent = item.icon
                  ? (Icons[item.icon] as ComponentType<
                      React.SVGProps<SVGSVGElement>
                    >)
                  : null;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={isNavActive(pathname, item.url)}
                    >
                      {IconComponent ? (
                        <IconComponent className='size-[1.125rem] shrink-0' />
                      ) : null}
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
                render={
                  <SidebarMenuButton
                    size='lg'
                    className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
                  />
                }
              >
                {user ? (
                  <Avatar className='h-8 w-8 rounded-xl ring-1 ring-[color-mix(in_srgb,var(--brand)_40%,transparent)]'>
                    <AvatarFallback className='rounded-xl bg-brand text-xs font-semibold text-brand-foreground'>
                      {user.fullName
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                {!isCollapsed ? (
                  <div className='min-w-0 flex-1 text-left text-sm leading-tight'>
                    <span className='block truncate font-semibold text-foreground'>
                      {user?.fullName || 'Admin'}
                    </span>
                    <span className='block truncate text-xs text-muted-foreground'>
                      System admin
                    </span>
                  </div>
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/overview')}
                  >
                    Org workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    Profile
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
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
