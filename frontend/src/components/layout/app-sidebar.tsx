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
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState } from 'react';
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
  pathname,
  label
}: {
  item: {
    title: string;
    url: string;
    items?: { title: string; url: string }[];
  };
  isActive: boolean;
  IconComponent: ComponentType<React.SVGProps<SVGSVGElement>> | null;
  pathname: string;
  label: string;
}) {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const open = userToggled ?? isActive;
  const t = useTranslations('nav');

  return (
    <Collapsible
      open={open}
      onOpenChange={setUserToggled}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton tooltip={label} isActive={isActive} />
        }
      >
        {IconComponent ? <IconComponent className='size-[1.125rem] shrink-0' /> : null}
        <span className='flex-1 group-data-[collapsible=icon]:hidden'>
          {label}
        </span>
        <Icons.chevronRight className='ml-auto size-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-panel-open/collapsible:rotate-90' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items?.map((subItem) => {
            const subLabel = t(subItem.title as 'dashboard');
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  render={<Link href={subItem.url} aria-label={subLabel} />}
                  isActive={isNavActive(pathname, subItem.url)}
                >
                  <span>{subLabel}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
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
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');

  return (
    <Sidebar collapsible='icon'>
      {/* Logo */}
      <SidebarHeader className='flex h-[var(--header-height)] shrink-0 justify-center border-b border-sidebar-border px-2 group-data-[collapsible=icon]:px-0'>
        <SidebarMenu className='w-full justify-center'>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='h-full w-full justify-start px-2.5 data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'
              onClick={() => router.push('/dashboard/overview')}
              aria-label='Survai'
            >
              {isCollapsed ? (
                <SurvaiMark className='mx-auto size-9' />
              ) : (
                <SurvaiLogo
                  className='w-full justify-start text-[1.85rem] font-bold leading-none tracking-[-0.06em] text-foreground md:text-[1.75rem]'
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
                const label = t(item.title as 'dashboard');

                if (hasChildren) {
                  return (
                    <NavCollapsibleItem
                      key={item.title}
                      item={item}
                      isActive={isActive}
                      IconComponent={IconComponent}
                      pathname={pathname}
                      label={label}
                    />
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={label} />}
                      tooltip={label}
                      isActive={isNavActive(pathname, item.url)}
                    >
                      {IconComponent && (
                        <IconComponent className='size-[1.125rem] shrink-0' />
                      )}
                      <span className='flex-1 group-data-[collapsible=icon]:hidden'>{label}</span>
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
                      <span>{t('account')}</span>
                      <span className='text-muted-foreground ml-auto text-xs'>
                        ⌘P
                      </span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/security')}
                  >
                    <Icons.lock className='text-muted-foreground mr-2 size-4' />
                    <span>{t('security')}</span>
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
                          toast.success(t('signOut'), {
                            description: tCommon('continue')
                          });
                        } catch {
                          toast.error(tCommon('errorGeneric'));
                        }
                      })();
                    }}
                  >
                    {isLoggingOut ? (
                      <Icons.spinner aria-hidden className='mr-2 size-4 animate-spin' />
                    ) : (
                      <Icons.logout aria-hidden className='mr-2 size-4' />
                    )}
                    <span>
                      {isLoggingOut ? tCommon('loading') : t('signOut')}
                    </span>
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
