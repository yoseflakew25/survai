'use client';

import { useMemo, useState } from 'react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { canEditOrg, useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import {
  compareSurveys,
  duplicateAsEndline,
  getSurveys,
  type SurveyCompareResult
} from '@/features/builder/api/service';
import { surveyByIdOptions } from '@/features/builder/api/queries';

function distSummary(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '—';
  const parts = rows.slice(0, 4).map((r) => {
    const label = String(r.label ?? r.option ?? r.value ?? '?');
    const count = r.count ?? r.n ?? r.pct ?? '';
    return `${label}: ${count}`;
  });
  return parts.join(' · ');
}

export function SurveyComparePanel({ surveyId }: { surveyId: string }) {
  const { user } = useAuth();
  const canEdit = canEditOrg(user?.role);
  const router = useRouter();
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const [otherId, setOtherId] = useState('');
  const [compare, setCompare] = useState<SurveyCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const siblingsQuery = useQuery({
    queryKey: ['surveys', 'family-siblings', survey?.instrumentFamilyId],
    enabled: Boolean(survey?.instrumentFamilyId),
    queryFn: async () => {
      const list = await getSurveys();
      return list.surveys.filter(
        (s) =>
          s.id !== surveyId &&
          s.instrumentFamilyId === survey?.instrumentFamilyId
      );
    }
  });

  const siblings = siblingsQuery.data ?? [];

  const allSurveysQuery = useQuery({
    queryKey: ['surveys', 'for-compare'],
    queryFn: getSurveys
  });

  const compareCandidates = useMemo(() => {
    if (siblings.length > 0) return siblings;
    return (allSurveysQuery.data?.surveys ?? []).filter((s) => s.id !== surveyId);
  }, [siblings, allSurveysQuery.data, surveyId]);

  if (!survey) return null;

  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        title='Baseline / endline'
        subtitle='Duplicate as endline, then compare matched questions'
      />
      <SurvaiPanelBody className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          {survey.waveLabel ? (
            <span className='bg-muted rounded-md px-2 py-1 capitalize'>
              Wave: {survey.waveLabel}
            </span>
          ) : (
            <span className='text-muted-foreground'>No wave label yet</span>
          )}
          {survey.instrumentFamilyId ? (
            <span className='text-muted-foreground font-mono'>
              family {survey.instrumentFamilyId.slice(0, 8)}
            </span>
          ) : null}
        </div>

        {canEdit ? (
          <Button
            type='button'
            variant='outline'
            className='h-10 w-full rounded-xl'
            disabled={duplicating}
            onClick={() => {
              void (async () => {
                setDuplicating(true);
                try {
                  const endline = await duplicateAsEndline(surveyId);
                  toast.success('Endline draft created', {
                    description: endline.title
                  });
                  router.push(`/dashboard/surveys/${endline.id}/builder`);
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : 'Could not duplicate survey'
                  );
                } finally {
                  setDuplicating(false);
                }
              })();
            }}
          >
            {duplicating ? (
              <Icons.spinner className='mr-2 size-4 animate-spin' />
            ) : (
              <Icons.plus className='mr-2 size-4' />
            )}
            Duplicate as endline
          </Button>
        ) : null}

        <div className='space-y-1.5'>
          <Label htmlFor='compare-other'>Compare with</Label>
          <select
            id='compare-other'
            className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm'
            value={otherId}
            onChange={(e) => {
              setOtherId(e.target.value);
              setCompare(null);
            }}
          >
            <option value=''>Select a survey…</option>
            {compareCandidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.waveLabel ? ` (${s.waveLabel})` : ''}
              </option>
            ))}
          </select>
          <Button
            type='button'
            className='mt-2 h-9 w-full rounded-xl'
            disabled={!otherId || loading}
            onClick={() => {
              void (async () => {
                setLoading(true);
                try {
                  const result = await compareSurveys(surveyId, otherId);
                  setCompare(result);
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : 'Comparison failed — surveys must share an instrument family'
                  );
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            {loading ? (
              <Icons.spinner className='mr-2 size-4 animate-spin' />
            ) : null}
            Run comparison
          </Button>
        </div>

        {compare ? (
          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-2 text-xs'>
              <div className='rounded-lg border border-border p-2'>
                <p className='font-semibold'>{compare.baseline.title}</p>
                <p className='text-muted-foreground tabular-nums'>
                  {compare.baseline.responseCount} responses
                  {compare.baseline.waveLabel
                    ? ` · ${compare.baseline.waveLabel}`
                    : ''}
                </p>
              </div>
              <div className='rounded-lg border border-border p-2'>
                <p className='font-semibold'>{compare.endline.title}</p>
                <p className='text-muted-foreground tabular-nums'>
                  {compare.endline.responseCount} responses
                  {compare.endline.waveLabel
                    ? ` · ${compare.endline.waveLabel}`
                    : ''}
                </p>
              </div>
            </div>

            <div className='overflow-x-auto rounded-xl border border-border'>
              <table className='w-full min-w-[28rem] text-left text-xs'>
                <thead className='bg-muted/40 text-muted-foreground'>
                  <tr>
                    <th className='px-2 py-2 font-medium'>Question</th>
                    <th className='px-2 py-2 font-medium'>Baseline</th>
                    <th className='px-2 py-2 font-medium'>Endline</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {compare.pairs.map((p) => (
                    <tr key={p.promptText}>
                      <td className='max-w-[12rem] truncate px-2 py-2 font-medium'>
                        {p.promptText}
                      </td>
                      <td className='text-muted-foreground px-2 py-2'>
                        {distSummary(p.baselineDistribution)}
                      </td>
                      <td className='text-muted-foreground px-2 py-2'>
                        {distSummary(p.endlineDistribution)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(compare.unmatchedBaseline.length > 0 ||
              compare.unmatchedEndline.length > 0) && (
              <p className='text-muted-foreground text-[11px] leading-relaxed'>
                Unmatched baseline: {compare.unmatchedBaseline.length}. Unmatched
                endline: {compare.unmatchedEndline.length}.
              </p>
            )}
          </div>
        ) : null}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
