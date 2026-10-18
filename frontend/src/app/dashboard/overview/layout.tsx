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

const KPI_CARDS = [
  {
    label: 'Total Surveys',
    value: '12',
    delta: '+3 this month'
  },
  {
    label: 'Total Responses',
    value: '1,847',
    delta: '+12.5%'
  },
  {
    label: 'Reports Generated',
    value: '8',
    delta: '+2 this week'
  },
  {
    label: 'Completion Rate',
    value: '78.3%',
    delta: '+4.2%'
  }
] as const;

export default function OverViewLayout({
  surveys,
  pie_stats: _pie_stats,
  bar_stats: _bar_stats,
  area_stats
}: {
  surveys: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  return (
    <PageContainer
      pageTitle='Welcome to Survai'
      pageDescription='Overview of your survey activity and performance'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
          {KPI_CARDS.map((kpi) => (
            <Card
              key={kpi.label}
              className='@container/card rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md'
            >
              <CardHeader>
                <CardDescription className='text-[13px]'>{kpi.label}</CardDescription>
                <CardTitle className='font-display text-2xl font-extrabold tracking-tight tabular-nums text-foreground @[250px]/card:text-3xl'>
                  {kpi.value}
                </CardTitle>
                <CardAction>
                  <Badge
                    variant='secondary'
                    className='rounded-full border border-border bg-brand-soft text-[11px] font-medium text-foreground'
                  >
                    <Icons.trendingUp />
                    {kpi.delta}
                  </Badge>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>{area_stats}</div>
          <div className='col-span-4 md:col-span-3'>{surveys}</div>
        </div>
      </div>
    </PageContainer>
  );
}
