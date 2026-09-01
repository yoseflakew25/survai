'use client';

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
}

export function DistributionChart({ distribution }: DistributionChartProps) {
  const data = distribution.buckets.map((b) => ({
    name: b.label,
    count: b.value,
    percent: b.percent
  }));

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1'>
            <CardTitle className='text-sm'>{distribution.questionText}</CardTitle>
            <CardDescription className='mt-0.5 text-xs'>
              {distribution.totalResponses} responses · {distribution.missingCount} missing
            </CardDescription>
          </div>
          <Badge variant='outline' className='shrink-0 text-[10px]'>
            {distribution.questionType.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={220}>
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
            />
            <Bar dataKey='count' radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
