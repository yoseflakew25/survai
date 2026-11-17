'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { StatsErrorAlert } from '@/features/overview/components/stats-error';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useTransition } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SalesError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('overview');
  const tCommon = useTranslations('common');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <StatsErrorAlert
      message={t('surveysFailed', { message: error.message })}
      action={
        <>
          <Button variant='outline' onClick={retry} disabled={isPending}>
            {isPending ? (
              <>
                <Icons.spinner
                  className='mr-2 h-4 w-4 animate-spin'
                  aria-hidden='true'
                />
                {t('retrying')}
              </>
            ) : (
              tCommon('retry')
            )}
          </Button>
          <span role='status' aria-live='polite' className='sr-only'>
            {isPending ? t('retrying') : ''}
          </span>
        </>
      }
    />
  );
}
