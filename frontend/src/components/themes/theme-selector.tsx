'use client';

import { Label } from '@/components/ui/label';
import { Icons } from '../icons';
import { Kbd } from '@/components/ui/kbd';

export function ThemeSelector() {
  return (
    <div className='flex items-center gap-2'>
      <Label className='sr-only'>Theme</Label>
      <div className='flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm'>
        <span className='text-muted-foreground hidden sm:block'>
          <Icons.palette />
        </span>
        <span className='text-muted-foreground block sm:hidden'>Theme</span>
        <span>Vercel</span>
        <Kbd>⌘⇧D</Kbd>
      </div>
    </div>
  );
}
