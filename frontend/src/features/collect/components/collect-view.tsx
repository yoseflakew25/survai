'use client';

import { useState, useCallback } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { surveyByIdOptions, surveyKeys } from '@/features/builder/api/queries';
import { collectStatsOptions } from '../api/queries';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Heading } from '@/components/ui/heading';
import {
  SurvaiBrandCard,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { closeSurvey, publishSurvey } from '../api/service';
import { collectStatsKeys } from '../api/queries';
import { CollectionQr } from './collection-qr';

interface CollectViewProps {
  surveyId: string;
}

export function CollectView({ surveyId }: CollectViewProps) {
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const { data: stats } = useSuspenseQuery(collectStatsOptions(surveyId));
  const queryClient = useQueryClient();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!survey) {
    notFound();
  }

  const isPublished = survey.status === 'published';
  const isClosed = survey.status === 'closed';
  const isLive = isPublished || isClosed;
  const hasLiveForm = Boolean(
    stats.currentVersionId ?? survey.currentVersionId
  );
  // Canonical share link is always the survey id (resolves to current version).
  const collectionPath =
    stats.collectionPath ??
    (hasLiveForm ? `/s/${surveyId}` : null);
  const collectionUrl =
    collectionPath && typeof window !== 'undefined'
      ? `${window.location.origin}${collectionPath}`
      : collectionPath
        ? collectionPath
        : '';

  const handlePublish = useCallback(async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      const result = await publishSurvey(surveyId);
      await queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(surveyId)
      });
      await queryClient.invalidateQueries({
        queryKey: collectStatsKeys.stats(surveyId)
      });
      toast.success('Survey published!', {
        description: `Live form ready at ${result.collectionPath}`
      });
    } catch (err) {
      toast.error('Publish failed', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Could not publish your survey. Please try again.'
      });
    } finally {
      setIsPublishing(false);
    }
  }, [surveyId, queryClient, isPublishing]);

  const handleClose = useCallback(async () => {
    if (isClosing || !isPublished) return;
    setIsClosing(true);
    try {
      await closeSurvey(surveyId);
      await queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(surveyId)
      });
      await queryClient.invalidateQueries({
        queryKey: collectStatsKeys.stats(surveyId)
      });
      toast.success('Survey closed', {
        description: 'New respondents can no longer start this survey.'
      });
    } catch (err) {
      toast.error('Close failed', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Could not close the survey.'
      });
    } finally {
      setIsClosing(false);
    }
  }, [surveyId, queryClient, isClosing, isPublished]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(collectionUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!', {
        description: 'Collection link copied to clipboard.'
      });
    } catch {
      toast.error('Copy failed', {
        description: 'Could not copy the link. Please copy it manually.'
      });
    }
  }, [collectionUrl]);

  return (
    <div className='space-y-4'>
      <div className='flex items-end justify-between gap-4'>
        <Heading
          title='Collect Responses'
          description='Publish your survey and share it with respondents'
        />
        <Badge
          variant='outline'
          className={
            isPublished
              ? 'rounded-full border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-[10px] font-semibold text-foreground'
              : isClosed
                ? 'rounded-full text-[10px]'
                : 'rounded-full text-[10px]'
          }
        >
          {isPublished ? 'Published' : isClosed ? 'Closed' : 'Draft'}
        </Badge>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.collect className='size-3.5' />}
              title='Share survey'
              subtitle={
                isLive
                  ? 'Link and QR for respondents'
                  : 'Publish to unlock your collection link'
              }
              badge={
                <Badge
                  variant='secondary'
                  className={cn(
                    'rounded-full text-[10px] font-semibold',
                    isPublished &&
                      'border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground'
                  )}
                >
                  {isPublished ? 'Live' : isClosed ? 'Closed' : 'Not published'}
                </Badge>
              }
            />
            <SurvaiPanelBody className='space-y-5'>
              {!isLive ? (
                <div className='space-y-4'>
                  <div className='rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center'>
                    <div className='mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'>
                      <Icons.collect className='size-5' />
                    </div>
                    <p className='mb-1 text-sm font-semibold tracking-tight'>
                      Ready when you are
                    </p>
                    <p className='text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed'>
                      Publishing creates a public link. Respondents can answer
                      without an account.
                    </p>
                  </div>
                  <Button
                    onClick={() => void handlePublish()}
                    disabled={isPublishing}
                    size='lg'
                    className='h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] hover:brightness-105'
                  >
                    {isPublishing ? (
                      <>
                        <Icons.spinner className='mr-2 size-4 animate-spin' />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <Icons.sparkles className='mr-2 size-4' />
                        Publish Survey
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5',
                      isPublished
                        ? 'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft/70'
                        : 'border-border bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                        isPublished
                          ? 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)]'
                          : 'border border-border bg-white text-muted-foreground'
                      )}
                    >
                      <Icons.circleCheck className='size-4' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold tracking-tight text-foreground'>
                        {isPublished
                          ? 'Your survey is live'
                          : 'This survey is closed'}
                      </p>
                      <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                        {isPublished
                          ? 'Share the link or QR below. No account required for respondents.'
                          : 'Existing links no longer accept new starts. Publish again for a new round.'}
                      </p>
                    </div>
                  </div>

                  {collectionUrl ? (
                    <div className='space-y-2'>
                      <label
                        htmlFor='collection-link'
                        className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'
                      >
                        Collection link
                      </label>
                      <div className='flex flex-col gap-2 sm:flex-row'>
                        <Input
                          id='collection-link'
                          value={collectionUrl}
                          readOnly
                          className='h-11 rounded-xl border-border bg-muted/20 font-mono text-xs sm:text-sm'
                        />
                        <Button
                          type='button'
                          onClick={() => void handleCopyLink()}
                          disabled={!collectionUrl}
                          className={cn(
                            'h-11 shrink-0 rounded-xl font-semibold sm:min-w-[7.5rem]',
                            copied
                              ? 'border border-border bg-foreground text-background hover:bg-foreground/90'
                              : 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] hover:brightness-105'
                          )}
                        >
                          {copied ? (
                            <>
                              <Icons.check className='mr-1.5 size-4' />
                              Copied
                            </>
                          ) : (
                            <>
                              <Icons.share className='mr-1.5 size-4' />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {collectionUrl ? (
                    <>
                      <div className='border-border border-t border-dashed' />
                      <div className='space-y-2'>
                        <p className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                          QR code
                        </p>
                        <CollectionQr url={collectionUrl} />
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </SurvaiPanelBody>

            {isPublished ? (
              <SurvaiPanelFooter>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  This form is locked. Collect responses here, then close the
                  survey when the round ends — questions stay fixed for data
                  integrity.
                </p>
              </SurvaiPanelFooter>
            ) : null}
          </SurvaiPanel>
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-6'>
          <SurvaiBrandCard
            title='View Results?'
            description={
              isLive
                ? `Collecting responses — ${stats.responseCount} received so far`
                : 'Publish your survey to start collecting responses'
            }
          >
            <Link
              href={`/dashboard/surveys/${surveyId}/analytics`}
              className={cn(
                'block w-full',
                !isLive && 'pointer-events-none opacity-50'
              )}
            >
              <Button
                className='h-11 w-full rounded-xl border border-foreground/15 bg-foreground font-semibold text-background hover:bg-foreground/90'
                size='lg'
                disabled={!isLive}
              >
                View Analytics
                <Icons.arrowRight className='ml-2 size-4' />
              </Button>
            </Link>
          </SurvaiBrandCard>

          <Separator />

          <SurvaiPanel>
            <SurvaiPanelBody className='flex flex-col gap-2'>
              {collectionPath ? (
                <a
                  href={collectionPath}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block'
                >
                  <Button className='h-auto w-full justify-start rounded-xl px-3 py-2.5 text-sm'>
                    <Icons.openInNew className='mr-2 size-3.5' />
                    Preview Survey
                  </Button>
                </a>
              ) : null}
              {isPublished ? (
                <Button
                  variant='outline'
                  className='w-full justify-start rounded-xl text-destructive hover:text-destructive'
                  onClick={() => void handleClose()}
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                  ) : (
                    <Icons.close className='mr-2 size-4' />
                  )}
                  Close Survey
                </Button>
              ) : null}
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>
      </div>
    </div>
  );
}
