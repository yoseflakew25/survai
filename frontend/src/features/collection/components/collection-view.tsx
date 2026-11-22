'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { publicSurveyOptions } from '../api/queries';
import { CollectionForm } from './collection-form';
import { Icons } from '@/components/icons';
import { SurvaiLogo } from '@/components/survai-logo';
import '../styles/collection-v2.css';

interface CollectionViewProps {
  versionId: string;
}

export function CollectionView({ versionId }: CollectionViewProps) {
  return <CollectionViewContent versionId={versionId} />;
}

function CollectionViewContent({ versionId }: { versionId: string }) {
  const t = useTranslations('publicCollect');
  const { data: survey } = useSuspenseQuery(publicSurveyOptions(versionId));

  if (!survey) {
    return (
      <div className='collect-v2-root'>
        <header className='collect-hdr'>
          <SurvaiLogo />
        </header>
        <main className='collect-done'>
          <div className='collect-done-panel' style={{ marginTop: 0 }}>
            <div className='collect-done-panel-body' style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 28px' }}>
              <div className='collect-done-panel-icon' aria-hidden='true'>
                <Icons.lock />
              </div>
              <div className='min-w-0'>
                <p className='collect-done-panel-title' style={{ fontSize: '1.125rem' }}>
                  {t('unavailable')}
                </p>
                <p className='collect-done-panel-copy'>{t('unavailableHint')}</p>
              </div>
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

  return <CollectionForm survey={survey} />;
}

export function CollectionLoading() {
  return (
    <div className='collect-v2-root'>
      <header className='collect-hdr'>
        <SurvaiLogo />
      </header>
      <main className='collect-main'>
        <div className='collect-hero' aria-hidden='true'>
          <div
            style={{
              height: 28,
              width: '72%',
              maxWidth: 320,
              background: 'color-mix(in srgb, var(--ink) 12%, transparent)'
            }}
          />
          <div
            style={{
              height: 14,
              width: '90%',
              maxWidth: 420,
              marginTop: 14,
              background: 'color-mix(in srgb, var(--ink) 8%, transparent)'
            }}
          />
          <div className='collect-hero-meta'>
            <span className='collect-chip' style={{ width: 88, height: 28 }} />
            <span className='collect-chip' style={{ width: 96, height: 28 }} />
            <span className='collect-chip' style={{ width: 72, height: 28 }} />
          </div>
        </div>

        <div className='collect-frame'>
          <div className='collect-section-head'>
            <span className='collect-section-index' />
            <div className='collect-section-copy' style={{ flex: 1 }}>
              <div
                style={{
                  height: 16,
                  width: '55%',
                  background: 'color-mix(in srgb, var(--ink) 12%, transparent)'
                }}
              />
              <div
                style={{
                  height: 12,
                  width: '70%',
                  marginTop: 8,
                  background: 'color-mix(in srgb, var(--ink) 8%, transparent)'
                }}
              />
            </div>
          </div>
          <div className='collect-questions'>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className='collect-q'>
                <div className='collect-q-head'>
                  <span className='collect-q-num'>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 14,
                        width: '65%',
                        background: 'color-mix(in srgb, var(--ink) 10%, transparent)'
                      }}
                    />
                  </div>
                </div>
                <div className='collect-q-body'>
                  <div
                    style={{
                      height: 48,
                      width: '100%',
                      border: '1px solid color-mix(in srgb, var(--ink) 14%, transparent)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className='collect-nav'>
            <span className='collect-btn' style={{ opacity: 0.35, pointerEvents: 'none' }} />
            <span
              className='collect-btn collect-btn-ink'
              style={{ opacity: 0.35, pointerEvents: 'none' }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
