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
import { SurveyStepper } from '@/components/survey-stepper';
import {
  SurvaiBrandCard,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CollectViewProps {
  surveyId: string;
}

export function CollectView({ surveyId }: CollectViewProps) {
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const { data: stats } = useSuspenseQuery(collectStatsOptions(surveyId));
  const queryClient = useQueryClient();

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedOverride, setPublishedOverride] = useState<boolean | null>(null);

  if (!survey) {
    notFound();
  }

  const isPublished =
    publishedOverride ?? (survey.status === 'published' || survey.status === 'closed');

  const collectionUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${surveyId}`;

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      // Simulate a service failure so the error path is exercised
      if (Math.random() < 0.15) {
        throw new Error('Publish service unavailable');
      }
      setPublishedOverride(true);
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      toast.success('Survey published!', {
        description: 'Your survey is now accepting responses.'
      });
    } catch {
      toast.error('Publish failed', {
        description: 'Could not publish your survey. Please try again.'
      });
    } finally {
      setIsPublishing(false);
    }
  }, [surveyId, queryClient]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(collectionUrl);
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
      {/* Header + progress stepper side by side */}
      <div className='flex items-end justify-between gap-4'>
        <Heading
          title='Collect Responses'
          description='Publish your survey and share it with respondents'
        />
        <SurveyStepper
          currentStep={4}
          badge={
            <Badge
              variant='outline'
              className={
                isPublished
                  ? 'rounded-full border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-[10px] text-brand-foreground'
                  : 'rounded-full text-[10px]'
              }
            >
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
          }
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Publish / Link Card */}
          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.collect className='size-3.5' />}
              title='Collection Link'
              subtitle='Share this link with respondents'
              badge={
                <Badge variant='secondary' className='rounded-full text-[10px]'>
                  {isPublished ? 'Live' : 'Not published'}
                </Badge>
              }
            />
            <SurvaiPanelBody>
              {!isPublished ? (
                <div className='space-y-4'>
                  <div className='rounded-xl border border-dashed border-border p-8 text-center'>
                    <div className='mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-soft text-foreground'>
                      <Icons.collect className='h-6 w-6' />
                    </div>
                    <p className='mb-1 text-sm font-medium'>This survey is not yet published</p>
                    <p className='text-muted-foreground text-xs'>
                      Publish to start collecting responses from respondents
                    </p>
                  </div>
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    size='lg'
                    className='h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground hover:brightness-105'
                  >
                    {isPublishing ? (
                      <>
                        <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <Icons.collect className='mr-2 h-4 w-4' />
                        Publish Survey
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className='space-y-4'>
                  {/* Live status banner */}
                  <div className='bg-success-muted flex items-center gap-3 rounded-lg p-3'>
                    <Icons.circleCheck className='text-success h-5 w-5 shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <p className='text-success-muted-foreground text-sm font-medium'>
                        Your survey is live and accepting responses
                      </p>
                      <p className='text-success-muted-foreground/80 text-xs'>
                        Share the link below to start collecting responses
                      </p>
                    </div>
                  </div>

                  {/* Collection link */}
                  <div className='space-y-2'>
                    <label htmlFor='collection-link' className='text-sm font-medium'>Collection Link</label>
                    <div className='flex gap-2'>
                      <Input id='collection-link' value={collectionUrl} readOnly className='font-mono text-sm' />
                      <Button variant='outline' onClick={handleCopyLink} className='shrink-0'>
                        <Icons.share className='mr-1 h-4 w-4' />
                        Copy
                      </Button>
                    </div>
                    <p className='text-muted-foreground text-xs'>
                      Share via SMS, WhatsApp, or email. Respondents do not need an account.
                    </p>
                  </div>
                </div>
              )}
            </SurvaiPanelBody>
          </SurvaiPanel>

          {/* QR Code */}
          {isPublished ? (
            <SurvaiPanel>
              <SurvaiPanelHeader
                icon={<Icons.page className='size-3.5' />}
                title='QR Code'
                subtitle='Print on paper surveys for easy digital access'
              />
              <SurvaiPanelBody>
                <div className='flex items-center gap-6'>
                  <div className='flex size-32 shrink-0 items-center justify-center rounded-xl bg-muted'>
                    <Icons.page className='text-muted-foreground/40 size-12' />
                  </div>
                  <div className='space-y-3'>
                    <p className='text-sm'>
                      Generate a QR code that links to your collection page.
                    </p>
                    <Button variant='outline' className='rounded-xl'>
                      <Icons.upload className='mr-1 h-3.5 w-3.5' />
                      Download QR Code
                    </Button>
                  </div>
                </div>
              </SurvaiPanelBody>
            </SurvaiPanel>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
          <SurvaiBrandCard
            title='View Results?'
            description={
              isPublished
                ? `Collecting responses — ${stats.responseCount} received so far`
                : 'Publish your survey to start collecting responses'
            }
          >
            <Link
              href={`/dashboard/surveys/${surveyId}/analytics`}
              className={cn(
                'block w-full',
                !isPublished && 'pointer-events-none opacity-50'
              )}
            >
              <Button
                className='h-11 w-full rounded-xl border border-foreground/15 bg-foreground font-semibold text-background hover:bg-foreground/90'
                size='lg'
                disabled={!isPublished}
              >
                View Analytics
                <Icons.arrowRight className='ml-2 h-4 w-4' />
              </Button>
            </Link>
          </SurvaiBrandCard>

          <Separator />

          <SurvaiPanel>
            <SurvaiPanelBody className='flex flex-col gap-2'>
              <a
                href={`/s/${surveyId}`}
                target='_blank'
                rel='noopener noreferrer'
                className='block'
              >
                <Button
                  variant='outline'
                  className='h-auto w-full justify-start rounded-xl px-3 py-2.5 text-sm'
                  disabled={!isPublished}
                >
                  <Icons.externalLink className='mr-2 h-4 w-4' />
                  Preview Survey
                </Button>
              </a>
              {isPublished ? (
                <a
                  href={`/s/${surveyId}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block'
                >
                  <Button className='h-auto w-full justify-start rounded-xl px-3 py-2.5 text-sm'>
                    <Icons.openInNew className='mr-2 size-3.5' />
                    Open in New Tab
                  </Button>
                </a>
              ) : null}
              <Button
                variant='outline'
                className='w-full justify-start rounded-xl text-destructive hover:text-destructive'
              >
                <Icons.close className='mr-2 h-4 w-4' />
                Close Survey
              </Button>
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>
      </div>
    </div>
  );
}