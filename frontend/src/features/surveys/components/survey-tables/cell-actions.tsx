'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { SurveyListItem } from '../../api/types';
import { useRouter } from 'next/navigation';

interface CellActionsProps {
  data: SurveyListItem;
}

export function CellActions({ data }: CellActionsProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost' size='icon-sm' className='data-popup-open:bg-muted' />
        }
      >
        <Icons.dots className='h-4 w-4' />
        <span className='sr-only'>Open menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/surveys/${data.id}/review`)}
          >
            <Icons.review className='mr-2 h-4 w-4' />
            Review
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/surveys/${data.id}/collect`)}
          >
            <Icons.collect className='mr-2 h-4 w-4' />
            Collect
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/surveys/${data.id}/analytics`)}
          >
            <Icons.analytics className='mr-2 h-4 w-4' />
            Analytics
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/surveys/${data.id}/respondents`)}
          >
            <Icons.teams className='mr-2 h-4 w-4' />
            Respondents
          </DropdownMenuItem>
          <DropdownMenuItem className='text-destructive'>
            <Icons.trash className='mr-2 h-4 w-4' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
