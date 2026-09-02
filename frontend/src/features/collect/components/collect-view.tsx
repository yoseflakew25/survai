'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import Link from 'next/link';

interface CollectViewProps {
  surveyId: string;
  surveyTitle: string;
  status: string;
  responseCount: number;
}

export function CollectView({
  surveyId,
  surveyTitle,
  status,
  responseCount
}: CollectViewProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(
    status === 'published' || status === 'closed'
  );

  const collectionUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${surveyId}`;

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    // Simulate publish API call
    await new Promise((r) => setTimeout(r, 1500));
    setIsPublished(true);
    setIsPublishing(false);
    toast.success('Survey published!', {
      description: 'Your survey is now accepting responses.'
    });
  }, []);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(collectionUrl);
    toast.success('Link copied!', {
      description: 'Collection link copied to clipboard.'
    });
  }, [collectionUrl]);

  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      {/* Main content */}
      <div className='space-y-6 lg:col-span-2'>
        {/* Status card */}
        <Card>
          <CardHeader>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <CardTitle className='text-base'>Publish Status</CardTitle>
                <CardDescription>
                  Control when your survey accepts responses
                </CardDescription>
              </div>
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!isPublished ? (
              <>
                <div className='rounded-lg border border-dashed p-6 text-center'>
                  <Icons.collect className='text-muted-foreground mx-auto mb-3 h-8 w-8' />
                  <p className='text-muted-foreground mb-1 text-sm font-medium'>
                    This survey is not yet published
                  </p>
                  <p className='text-muted-foreground mb-4 text-xs'>
                    Publish to start collecting responses from respondents
                  </p>
                  <Button onClick={handlePublish} disabled={isPublishing}>
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
              </>
            ) : (
              <>
                <div className='flex items-center gap-3 rounded-lg bg-primary/5 p-4'>
                  <Icons.circleCheck className='text-primary size-5 shrink-0' />
                  <div>
                    <p className='text-sm font-medium'>
                      Your survey is live
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Share the link below to start collecting responses
                    </p>
                  </div>
                </div>

                {/* Collection link */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>
                    Collection Link
                  </label>
                  <div className='flex gap-2'>
                    <Input
                      value={collectionUrl}
                      readOnly
                      className='font-mono text-sm'
                    />
                    <Button variant='outline' onClick={handleCopyLink}>
                      <Icons.share className='mr-1 h-4 w-4' />
                      Copy
                    </Button>
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    Share this link via SMS, WhatsApp, or email. Respondents
                    do not need an account.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* QR Code placeholder */}
        {isPublished && (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>QR Code</CardTitle>
              <CardDescription>
                Print this QR code on paper surveys for easy digital access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-6'>
                <div className='bg-muted flex size-32 items-center justify-center rounded-lg'>
                  <Icons.page className='text-muted-foreground/40 size-12' />
                </div>
                <div className='space-y-2'>
                  <p className='text-sm'>
                    Generate a QR code that links to your collection page.
                  </p>
                  <Button variant='outline' >
                    <Icons.upload className='mr-1 h-3.5 w-3.5' />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className='space-y-6'>
        {/* Response stats */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Responses</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Total responses</span>
              <span className='text-2xl font-bold'>{responseCount}</span>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Status</span>
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {isPublished ? 'Collecting' : 'Not started'}
              </Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Anonymous</span>
              <span className='font-medium'>Yes</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Actions</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <Button variant='outline' className='w-full justify-start' disabled={!isPublished}>
              <Icons.page className='mr-2 h-4 w-4' />
              Preview Survey
            </Button>
            <Link href={`/dashboard/surveys/${surveyId}/analytics`} className='w-full'>
              <Button variant='outline' className='w-full justify-start' disabled={!isPublished}>
                <Icons.analytics className='mr-2 h-4 w-4' />
                View Analytics
              </Button>
            </Link>
            {isPublished && (
              <Button
                variant='outline'
                className='w-full justify-start text-destructive hover:text-destructive'
              >
                <Icons.close className='mr-2 h-4 w-4' />
                Close Survey
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
