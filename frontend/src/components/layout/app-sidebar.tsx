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
import { useAuth } from '@/lib/auth-context';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';
import { useLogo } from '@/hooks/use-logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { logo, alt } = useLogo(isCollapsed);

  return (
    <Sidebar collapsible='icon'>
      {/* Logo */}
      <SidebarHeader className='group-data-[collapsible=icon]:pt-4'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
              onClick={() => router.push('/dashboard/overview')}
            >
              <img
                src={logo}
                alt={alt}
                className={cn(
                  'transition-all duration-200',
                  isCollapsed ? 'h-8 w-auto mx-auto' : 'h-8 w-auto'
                )}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className='overflow-x-hidden'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-0'>
            <SidebarMenu>
              {group.items.map((item) => {
                const IconComponent = item.icon
                  ? (Icons[item.icon] as ComponentType<React.SVGProps<SVGSVGElement>>)
                  : null;
                const hasChildren = item?.items && item?.items.length > 0;
                const isActive = pathname === item.url || item.items?.some((sub) => pathname === sub.url);

                if (hasChildren) {
                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isActive}
                      render={<SidebarMenuItem />}
                    >
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isActive}
                          />
                        }
                      >
                        {IconComponent && <IconComponent className='size-4 shrink-0' />}
                        <span className='flex-1 group-data-[collapsible=icon]:hidden'>{item.title}</span>
                        <Icons.chevronRight className='ml-auto size-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-panel-open/collapsible:rotate-90' />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                render={<Link href={subItem.url} aria-label={subItem.title} />}
                                isActive={pathname === subItem.url}
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

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={pathname === item.url}
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
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarFallback className='rounded-lg bg-primary/10 text-primary text-xs font-medium'>
                      {user.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isCollapsed && (
                  <div className='flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold block'>{user?.fullName || 'User'}</span>
                    <span className='text-muted-foreground truncate text-xs block'>{user?.email || ''}</span>
                  </div>
                )}
                {!isCollapsed && (
                  <Icons.chevronsDown className='text-muted-foreground size-4 shrink-0 opacity-50' />
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
                    <Avatar className='h-9 w-9'>
                      <AvatarFallback className='rounded-lg bg-primary/10 text-primary text-sm font-medium'>
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

                {/* Actions */}
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <Icons.account className='text-muted-foreground mr-2 size-4' />
                    <span>Profile</span>
                    <span className='text-muted-foreground ml-auto text-xs'>⌘P</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                    <Icons.settings className='text-muted-foreground mr-2 size-4' />
                    <span>Settings</span>
                    <span className='text-muted-foreground ml-auto text-xs'>⌘S</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                {/* Sign out */}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      router.push('/auth/sign-in');
                    }}
                    className='text-destructive focus:text-destructive'
                  >
                    <Icons.logout aria-hidden className='mr-2 size-4' />
                    <span>Sign out</span>
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
