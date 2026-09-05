'use client';

import { Icons } from '@/components/icons';
import type { Icon } from '@/components/icons';
import type { ComponentType } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export function NavProjects({
  projects
}: {
  projects: {
    name: string;
    url: string;
    icon: Icon;
  }[];
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.length === 0 && (
          <SidebarMenuItem>
            <p className='text-sidebar-foreground/70 px-2 py-1.5 text-xs'>
              No projects yet. Create one to see it here.
            </p>
          </SidebarMenuItem>
        )}
        {projects.map((item) => {
          const IconComponent =
            (Icons[item.icon] as ComponentType<React.SVGProps<SVGSVGElement>>) || null;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                render={<a href={item.url} aria-label={item.name} />}
                className='gap-3'
              >
                {IconComponent && (
                  <IconComponent className='text-sidebar-foreground shrink-0 size-4' />
                )}
                <span>{item.name}</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
                  <Icons.dots className='h-4 w-4' />
                  <span className='sr-only'>More</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='w-48 rounded-lg'
                  side={isMobile ? 'bottom' : 'right'}
                  align={isMobile ? 'end' : 'start'}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <Icons.workspace className='text-muted-foreground mr-2 h-4 w-4' />
                      <span>View Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Icons.share className='text-muted-foreground mr-2 h-4 w-4' />
                      <span>Share Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <Icons.trash className='text-muted-foreground mr-2 h-4 w-4' />
                      <span>Delete Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}
        <SidebarMenuItem>
          <SidebarMenuButton className='text-sidebar-foreground/70'>
            <Icons.dots className='text-sidebar-foreground/70 h-4 w-4' />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
