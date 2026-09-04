'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';

export function SettingsGeneral() {
  const { user } = useAuth();

  return (
    <div className='space-y-4'>
      {/* Organization */}
      <div className='rounded-xl border bg-card'>
        <div className='border-b px-6 py-4'>
          <h3 className='font-semibold text-primary'>Organization</h3>
          <p className='text-muted-foreground mt-0.5 text-sm'>
            Basic information about your organization.
          </p>
        </div>
        <div className='space-y-4 p-6'>
          <div className='space-y-2'>
            <Label htmlFor='org-name'>Organization Name</Label>
            <Input
              id='org-name'
              defaultValue={user?.organizationName || ''}
              placeholder='Your organization name'
              className='h-11 max-w-md'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='org-description'>Description</Label>
            <Textarea
              id='org-description'
              placeholder='Describe your organization...'
              className='min-h-[80px] max-w-lg'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='org-website'>Website</Label>
            <Input
              id='org-website'
              placeholder='https://example.com'
              className='h-11 max-w-md'
            />
          </div>
        </div>
        <div className='border-t px-6 py-4'>
          <div className='flex justify-end'>
            <Button>Save Changes</Button>
          </div>
        </div>
      </div>

      
    </div>
  );
}
