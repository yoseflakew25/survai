'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CrossTabResult } from '../api/types';

interface CrossTabTableProps {
  result: CrossTabResult;
}

function getIntensityColor(percent: number, maxPercent: number): string {
  if (maxPercent === 0) return '';
  const intensity = percent / maxPercent;
  if (intensity > 0.7) return 'bg-primary/20 font-medium';
  if (intensity > 0.4) return 'bg-primary/10';
  if (intensity > 0.15) return 'bg-primary/5';
  return '';
}

export function CrossTabTable({ result }: CrossTabTableProps) {
  const maxPercent = Math.max(...result.cells.map((c) => c.percent));

  // Build a lookup map for quick access
  const cellMap = new Map<string, { count: number; percent: number }>();
  for (const cell of result.cells) {
    cellMap.set(`${cell.rowLabel}|${cell.colLabel}`, {
      count: cell.count,
      percent: cell.percent
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <CardTitle className='text-base'>Cross-Tabulation</CardTitle>
            <CardDescription>
              {result.questionAText} × {result.questionBText}
            </CardDescription>
          </div>
          <Badge variant='outline' className='text-[10px]'>
            {result.totalResponses} responses
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr>
                <th className='text-muted-foreground pb-2 pr-4 text-left text-xs font-medium'>
                  {result.questionAText} ↓ / {result.questionBText} →
                </th>
                {result.colLabels.map((col) => (
                  <th
                    key={col}
                    className='text-muted-foreground pb-2 px-2 text-center text-xs font-medium'
                  >
                    {col}
                  </th>
                ))}
                <th className='text-muted-foreground pb-2 pl-2 text-center text-xs font-medium'>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rowLabels.map((row) => {
                const rowTotal = result.colLabels.reduce((sum, col) => {
                  const cell = cellMap.get(`${row}|${col}`);
                  return sum + (cell?.count ?? 0);
                }, 0);

                return (
                  <tr key={row} className='border-t'>
                    <td className='py-2 pr-4 text-xs font-medium'>{row}</td>
                    {result.colLabels.map((col) => {
                      const cell = cellMap.get(`${row}|${col}`);
                      const count = cell?.count ?? 0;
                      const percent = cell?.percent ?? 0;

                      return (
                        <td
                          key={col}
                          className={cn(
                            'py-2 px-2 text-center text-xs',
                            getIntensityColor(percent, maxPercent)
                          )}
                        >
                          <div>{count}</div>
                          <div className='text-muted-foreground text-[10px]'>
                            {percent.toFixed(1)}%
                          </div>
                        </td>
                      );
                    })}
                    <td className='py-2 pl-2 text-center text-xs font-medium'>
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className='border-t font-medium'>
                <td className='py-2 pr-4 text-xs'>Total</td>
                {result.colLabels.map((col) => {
                  const colTotal = result.rowLabels.reduce((sum, row) => {
                    const cell = cellMap.get(`${row}|${col}`);
                    return sum + (cell?.count ?? 0);
                  }, 0);
                  return (
                    <td key={col} className='py-2 px-2 text-center text-xs'>
                      {colTotal}
                    </td>
                  );
                })}
                <td className='py-2 pl-2 text-center text-xs'>
                  {result.totalResponses}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
