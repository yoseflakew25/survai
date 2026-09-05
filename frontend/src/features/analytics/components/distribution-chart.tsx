'use client';

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Rectangle
} from 'recharts';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { QuestionDistribution } from '../api/types';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

interface DistributionChartProps {
  distribution: QuestionDistribution;
  surveyId: string;
}

export function DistributionChart({
  distribution,
  surveyId
}: DistributionChartProps) {
  const router = useRouter();
  const data = distribution.buckets.map((b) => ({
    name: b.label,
    count: b.value,
    percent: b.percent
  }));

  const drillInto = (bucketLabel: string | undefined) => {
    if (!bucketLabel) return;
    const params = new URLSearchParams({
      question: distribution.questionId,
      answer: bucketLabel
    });
    router.push(
      `/dashboard/surveys/${surveyId}/respondents?${params.toString()}`
    );
  };

  return (
    <div className='rounded-lg bg-muted/40 p-4'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium'>{distribution.questionText}</p>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {distribution.totalResponses} responses · {distribution.missingCount} missing
          </p>
        </div>
        <Badge variant='outline' className='shrink-0 text-[10px]'>
          {distribution.questionType.replace('_', ' ')}
        </Badge>
      </div>
      <div className='mt-3'>
        <ResponsiveContainer width='100%' height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis
              dataKey='name'
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-30}
              textAnchor='end'
              height={60}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value, _name, props) => [
                `${value} (${(props?.payload as { percent: number } | undefined)?.percent ?? 0}%)`,
                'Responses'
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--border)'
              }}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Bar
              dataKey='count'
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
              onClick={(data) =>
                drillInto((data.payload as { name?: string } | undefined)?.name)
              }
              shape={(props) => (
                <Rectangle {...props} style={{ cursor: 'pointer' }} />
              )}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className='text-muted-foreground mt-1 flex items-center justify-end gap-1 text-[11px]'>
        <Icons.arrowRight className='h-3 w-3' />
        Click a bar to view those respondents
      </p>
    </div>
  );
}
