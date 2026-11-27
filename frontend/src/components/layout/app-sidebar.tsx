'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import { isOrgOwner, useAuth } from '@/lib/auth-context';
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
    <Collapsible open={open} onOpenChange={setUserToggled} render={<SidebarMenuItem />}>
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={label} isActive={isActive} />}>
        <SidebarActiveBar isActive={isActive} />
        <SidebarNavIcon icon={IconComponent} isActive={isActive} />
        <span className='flex-1 group-data-[collapsible=icon]:hidden'>{label}</span>
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
  const { isMobile } = useSidebar();
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');

  return (
    <Sidebar collapsible='icon'>
      <SidebarBrandHeader href='/dashboard/overview' ariaLabel='Survai' />

      <SidebarContent className='overflow-x-hidden pt-2'>
        {filteredGroups.map((group, groupIndex) => (
          <SidebarGroup
            key={group.label || `group-${groupIndex}`}
            className={cn(groupIndex > 0 && 'mt-1 border-t border-foreground/[0.08] pt-3')}
          >

            <SidebarMenu>
              {group.items.map((item) => {
                const IconComponent = item.icon
                  ? (Icons[item.icon] as ComponentType<React.SVGProps<SVGSVGElement>>)
                  : null;
                const hasChildren = item?.items && item?.items.length > 0;
                const active = isNavActive(pathname, item.url);
                const isActive =
                  active || Boolean(item.items?.some((sub) => isNavActive(pathname, sub.url)));
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
                      isActive={active}
                    >
                      <SidebarActiveBar isActive={active} />
                      <SidebarNavIcon icon={IconComponent} isActive={active} />
                      <span className='flex-1 group-data-[collapsible=icon]:hidden'>{label}</span>
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
                <SidebarUserAvatar name={user?.fullName} fallback='U' />
                <SidebarUserTriggerMeta
                  title={user?.fullName || 'User'}
                  subtitle={user?.email || ''}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-60 rounded-none border-foreground/20'
                side={isMobile ? 'top' : 'right'}
                align='end'
                sideOffset={8}
              >
                <div className='flex items-center gap-2.5 border-b border-foreground/[0.08] bg-brand-soft/35 p-2.5'>
                  <SidebarUserAvatar name={user?.fullName} fallback='U' size='md' />
                  <div className='min-w-0 flex-1 text-left leading-tight'>
                    <span className='block truncate text-sm font-semibold tracking-tight text-foreground'>
                      {user?.fullName || 'User'}
                    </span>
                    <span className='block truncate font-mono text-[11px] text-muted-foreground'>
                      {user?.email || ''}
                    </span>
                  </div>
                </div>

                <DropdownMenuGroup className='pt-1'>
                  {owner ? (
                    <DropdownMenuItem
                      className='rounded-none'
                      onClick={() => router.push('/dashboard/profile')}
                    >
                      <Icons.account className='mr-2 size-4 text-muted-foreground' />
                      <span>{t('account')}</span>
                      <span className='ml-auto font-mono text-xs text-muted-foreground'>⌘P</span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className='rounded-none'
                    onClick={() => router.push('/dashboard/security')}
                  >
                    <Icons.lock className='mr-2 size-4 text-muted-foreground' />
                    <span>{t('security')}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className='rounded-none'
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
                    <span>{isLoggingOut ? tCommon('loading') : t('signOut')}</span>
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
