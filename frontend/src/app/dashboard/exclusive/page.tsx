'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function ExclusivePage() {
  return (
    <PageContainer>
      <div className='space-y-4'>
        <div>
          <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
            <Icons.badgeCheck className='h-7 w-7 text-green-600' />
            Exclusive Area
          </h1>
          <p className='text-muted-foreground'>
            This page contains exclusive features for Pro plan organizations.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome to the Exclusive Page</CardTitle>
            <CardDescription>
              Plan-based access control will be available when you connect a real authentication
              provider with subscription management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-lg'>Have a wonderful day!</div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
