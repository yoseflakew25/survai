'use client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import type { ComponentType } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { navGroups } from '@/config/nav-config';
import { isOrgOwner, useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Icons } from '../icons';
import { SurvaiLogo, SurvaiMark } from '@/components/survai-logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** True when pathname is the href or a nested child route under it. */
function isNavActive(pathname: string, href: string): boolean {
  if (!href || href === '#') return false;
  if (pathname === href) return true;
  const base = href.endsWith('/') ? href.slice(0, -1) : href;
  return pathname.startsWith(`${base}/`);
}

function NavCollapsibleItem({
  item,
  isActive,
  IconComponent,
  pathname
}: {
  item: {
    title: string;
    url: string;
    items?: { title: string; url: string }[];
  };
  isActive: boolean;
  IconComponent: ComponentType<React.SVGProps<SVGSVGElement>> | null;
  pathname: string;
}) {
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton tooltip={item.title} isActive={isActive} />
        }
      >
        {IconComponent ? <IconComponent className='size-4 shrink-0' /> : null}
        <span className='flex-1 group-data-[collapsible=icon]:hidden'>
          {item.title}
        </span>
        <Icons.chevronRight className='ml-auto size-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-panel-open/collapsible:rotate-90' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items?.map((subItem) => (
            <SidebarMenuSubItem key={subItem.title}>
              <SidebarMenuSubButton
                render={<Link href={subItem.url} aria-label={subItem.title} />}
                isActive={isNavActive(pathname, subItem.url)}
              >
                <span>{subItem.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const owner = isOrgOwner(user?.role);
  const filteredGroups = useFilteredNavGroups(navGroups);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible='icon'>
      {/* Logo */}
      <SidebarHeader className='flex h-16 shrink-0 justify-center border-b border-sidebar-border px-2 md:h-14 group-data-[collapsible=icon]:px-0'>
        <SidebarMenu className='w-full justify-center'>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='h-full w-full justify-start px-2.5 data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'
              onClick={() => router.push('/dashboard/overview')}
              aria-label='Survai'
            >
              {isCollapsed ? (
                <SurvaiMark className='mx-auto size-8' />
              ) : (
                <SurvaiLogo
                  className='w-full justify-start gap-2.5 text-[1.65rem] leading-none tracking-[-0.05em] text-primary md:text-[1.5rem]'
                  markClassName='h-[1.1em] w-auto'
                />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className='overflow-x-hidden px-1.5 pt-3'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-1'>
            <SidebarMenu>
              {group.items.map((item) => {
                const IconComponent = item.icon
                  ? (Icons[item.icon] as ComponentType<React.SVGProps<SVGSVGElement>>)
                  : null;
                const hasChildren = item?.items && item?.items.length > 0;
                const isActive =
                  isNavActive(pathname, item.url) ||
                  Boolean(item.items?.some((sub) => isNavActive(pathname, sub.url)));

                if (hasChildren) {
                  return (
                    <NavCollapsibleItem
                      key={item.title}
                      item={item}
                      isActive={isActive}
                      IconComponent={IconComponent}
                      pathname={pathname}
                    />
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={isNavActive(pathname, item.url)}
                    >
                      {IconComponent && <IconComponent className='size-4 shrink-0' />}
                      <span className='flex-1 group-data-[collapsible=icon]:hidden'>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User Footer */}
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
                {user && (
                  <Avatar className='h-8 w-8 rounded-xl ring-1 ring-[color-mix(in_srgb,var(--brand)_40%,transparent)]'>
                    <AvatarFallback className='rounded-xl bg-brand text-xs font-semibold text-brand-foreground'>
                      {user.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isCollapsed && (
                  <div className='min-w-0 flex-1 text-left text-sm leading-tight'>
                    <span className='block truncate font-semibold text-foreground'>
                      {user?.fullName || 'User'}
                    </span>
                    <span className='block truncate text-xs text-muted-foreground'>
                      {user?.email || ''}
                    </span>
                  </div>
                )}
                {!isCollapsed && (
                  <Icons.chevronsDown className='size-4 shrink-0 text-muted-foreground opacity-60' />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                {/* User info header */}
                <div className='flex items-center gap-2 p-2'>
                  {user && (
                    <Avatar className='h-9 w-9 rounded-xl'>
                      <AvatarFallback className='rounded-xl bg-brand text-sm font-semibold text-brand-foreground'>
                        {user.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className='flex-1 text-left text-sm leading-tight'>
                    <span className='font-semibold block'>{user?.fullName || 'User'}</span>
                    <span className='text-muted-foreground text-xs block'>{user?.email || ''}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  {owner ? (
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard/profile')}
                    >
                      <Icons.account className='text-muted-foreground mr-2 size-4' />
                      <span>Account</span>
                      <span className='text-muted-foreground ml-auto text-xs'>
                        ⌘P
                      </span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/security')}
                  >
                    <Icons.lock className='text-muted-foreground mr-2 size-4' />
                    <span>Security</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                {/* Sign out */}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={isLoggingOut}
                    variant='destructive'
                    onClick={() => {
                      void (async () => {
                        try {
                          await logout();
                          toast.success('Signed out', {
                            description: 'See you next time.'
                          });
                        } catch {
                          toast.error('Could not sign out', {
                            description: 'Try again in a moment.'
                          });
                        }
                      })();
                    }}
                  >
                    {isLoggingOut ? (
                      <Icons.spinner aria-hidden className='mr-2 size-4 animate-spin' />
                    ) : (
                      <Icons.logout aria-hidden className='mr-2 size-4' />
                    )}
                    <span>{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
