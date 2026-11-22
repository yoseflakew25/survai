'use client';

import { Icons } from '@/components/icons';
import { displaySurveyDescription, displaySurveyTitle } from '@/lib/survey-display';
import { useLocale, useTranslations } from 'next-intl';
import '../styles/collection-v2.css';

interface CollectionCompleteProps {
  title: string;
  description?: string | null;
  answeredCount: number;
  totalQuestions: number;
  submittedAt: string;
  collectsIdentity?: boolean;
  onReset: () => void;
}

function formatSubmittedAt(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'am' ? 'am-ET' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function CollectionComplete({
  title,
  description,
  answeredCount,
  totalQuestions,
  submittedAt,
  collectsIdentity = true,
  onReset
}: CollectionCompleteProps) {
  const t = useTranslations('publicCollect');
  const locale = useLocale();
  const displayTitle = displaySurveyTitle(title);
  const displayDescription = displaySurveyDescription(title, description);

  return (
    <div className='collect-v2-root'>
      <main className='collect-done'>
        <div className='collect-done-hero'>
          <p className='collect-done-kicker'>
            <i aria-hidden='true' />
            {t('responseRecorded')}
          </p>

          <div className='collect-done-mark' aria-hidden='true'>
            <Icons.check strokeWidth={2.5} />
          </div>

          <h1 className='collect-done-title'>{t('thankYou')}</h1>
          <p className='collect-done-copy'>
            {t('thankYouHint')} <strong>{displayTitle}</strong>
          </p>
          {displayDescription ? (
            <p className='collect-done-copy' style={{ marginTop: 6, fontSize: '0.8125rem' }}>
              {displayDescription}
            </p>
          ) : null}

          <div className='collect-done-meta'>
            <span className='collect-chip'>
              <Icons.circleCheck />
              {t('answeredOf', {
                answered: answeredCount,
                total: totalQuestions
              })}
            </span>
            <span className='collect-chip'>
              <Icons.clock />
              {formatSubmittedAt(submittedAt, locale)}
            </span>
          </div>
        </div>

        <div className='collect-done-panel'>
          <div className='collect-done-panel-body'>
            <div className='collect-done-panel-icon' aria-hidden='true'>
              <Icons.lock />
            </div>
            <div className='min-w-0'>
              <p className='collect-done-panel-title'>
                {collectsIdentity ? t('detailsReceived') : t('submittedSecurely')}
              </p>
              <p className='collect-done-panel-copy'>
                {collectsIdentity ? t('detailsReceivedHint') : t('submittedSecurelyHint')}
              </p>
            </div>
          </div>
          <div className='collect-done-panel-action'>
            <button type='button' className='collect-btn' onClick={onReset}>
              <Icons.forms />
              {t('submitAnother')}
            </button>
          </div>
        </div>

        <p className='collect-powered'>
          {t('poweredBy')}{' '}
          <span>
            surv<span className='ai'>ai</span>
          </span>
        </p>
      </main>
    </div>
  );
}
