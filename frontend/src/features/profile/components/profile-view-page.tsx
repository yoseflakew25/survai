'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function ProfileViewPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <p className='text-muted-foreground'>Not signed in.</p>
      </div>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center gap-4'>
            <Avatar className='h-20 w-20'>
              <AvatarFallback className='text-lg'>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className='text-lg font-semibold'>{user.fullName}</h3>
              <p className='text-muted-foreground text-sm'>{user.email}</p>
              <Badge variant='secondary' className='mt-1 capitalize'>
                {user.role}
              </Badge>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='full-name'>Full Name</Label>
              <Input id='full-name' defaultValue={user.fullName} />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input id='email' defaultValue={user.email} disabled />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='role'>Role</Label>
              <Input id='role' defaultValue={user.role} disabled />
            </div>
            {user.organizationName && (
              <div className='grid gap-2'>
                <Label htmlFor='org'>Organization</Label>
                <Input id='org' defaultValue={user.organizationName} disabled />
              </div>
            )}
          </div>

          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
