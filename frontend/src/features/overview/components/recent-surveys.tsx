'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import Link from 'next/link';

const surveyData = [
  {
    id: 'plan_001',
    title: 'Community Health Assessment',
    organization: 'DICDO',
    status: 'approved' as const,
    sections: 5,
    updatedAt: '2 hours ago'
  },
  {
    id: 'plan_002',
    title: 'Education Program Evaluation',
    organization: 'DICDO',
    status: 'draft' as const,
    sections: 4,
    updatedAt: '5 hours ago'
  },
  {
    id: 'plan_003',
    title: 'Water & Sanitation Baseline',
    organization: 'DICDO',
    status: 'draft' as const,
    sections: 6,
    updatedAt: '1 day ago'
  },
  {
    id: 'plan_004',
    title: 'Livelihoods Impact Survey',
    organization: 'DICDO',
    status: 'approved' as const,
    sections: 5,
    updatedAt: '2 days ago'
  },
  {
    id: 'plan_005',
    title: 'Food Security Assessment',
    organization: 'DICDO',
    status: 'draft' as const,
    sections: 4,
    updatedAt: '3 days ago'
  }
];

const statusVariant = {
  approved: 'default' as const,
  draft: 'secondary' as const
};

const statusLabel = {
  approved: 'Approved',
  draft: 'Draft'
};

export function RecentSurveys() {
  return (
    <Card className='h-full border'>
      <CardHeader className='border-b'>
        <CardTitle className='text-primary font-semibold text-lg'>Recent Plans</CardTitle>
        <CardDescription>5 plans updated this week</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col'>
        <div className='flex-1 space-y-1'>
          {surveyData.map((survey) => (
            <Link
              key={survey.id}
              href={`/dashboard/plans/${survey.id}`}
              className='flex items-center rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50'
            >
              <Avatar className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                <AvatarFallback className='text-primary text-xs font-medium'>
                  {survey.title
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='ml-4 min-w-0 flex-1 space-y-1'>
                <p className='truncate text-sm leading-none font-medium'>
                  {survey.title}
                </p>
                <div className='flex items-center gap-2'>
                  <p className='text-muted-foreground text-xs'>
                    {survey.sections} sections
                  </p>
                  <span className='text-muted-foreground text-xs'>·</span>
                  <p className='text-muted-foreground text-xs'>
                    {survey.updatedAt}
                  </p>
                </div>
              </div>
              <Badge
                variant={statusVariant[survey.status]}
                className='ml-2 shrink-0 text-[10px]'
              >
                {statusLabel[survey.status]}
              </Badge>
            </Link>
          ))}
        </div>
        <div className='mt-4 border-t pt-4'>
          <Link href='/dashboard/plans' className='inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'>
            View All Plans
            <Icons.arrowRight className='ml-2 size-4' />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
