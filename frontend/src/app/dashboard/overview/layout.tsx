import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import React from 'react';

export default function OverViewLayout({
  surveys,
  pie_stats,
  bar_stats,
  area_stats
}: {
  surveys: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  return (
    <PageContainer
      pageTitle='Wellcome to Survai'
      pageDescription='Overview of your survey activity and performance'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card className='@container/card border shadow-none transition-shadow hover:shadow-md'>
            <CardHeader>
              <CardDescription>Total Surveys</CardDescription>
              <CardTitle className='text-primary text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                12
              </CardTitle>
              <CardAction>
                <Badge>
                  <Icons.trendingUp />
                  +3 this month
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
          <Card className='@container/card border shadow-none transition-shadow hover:shadow-md'>
            <CardHeader>
              <CardDescription>Total Responses</CardDescription>
              <CardTitle className='text-primary text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                1,847
              </CardTitle>
              <CardAction>
                <Badge>
                  <Icons.trendingUp />
                  +12.5%
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
          <Card className='@container/card border shadow-none transition-shadow hover:shadow-md'>
            <CardHeader>
              <CardDescription>Reports Generated</CardDescription>
              <CardTitle className='text-primary text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                8
              </CardTitle>
              <CardAction>
                <Badge>
                  <Icons.trendingUp />
                  +2 this week
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
          <Card className='@container/card border shadow-none transition-shadow hover:shadow-md'>
            <CardHeader>
              <CardDescription>Completion Rate</CardDescription>
              <CardTitle className='text-primary text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                78.3%
              </CardTitle>
              <CardAction>
                <Badge>
                  <Icons.trendingUp />
                  +4.2%
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'> {area_stats}</div>
          <div className='col-span-4 md:col-span-3'>
            {surveys}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
