'use client';

import { useTranslations } from 'next-intl';

const STAGE_IDS = ['plan', 'build', 'review', 'collect', 'analyze', 'report'] as const;

export function AuthShowcase() {
  const tAuth = useTranslations('auth');
  const tLanding = useTranslations('landing');

  return (
    <aside className='auth-showcase' aria-hidden='true'>
      <div className='auth-showcase-inner'>
        <div>
          <p className='auth-showcase-eyebrow'>{tAuth('showcaseEyebrow')}</p>
          <p className='auth-showcase-headline'>{tAuth('showcaseHeadline')}</p>
        </div>

        <ol className='auth-stage-list'>
          {STAGE_IDS.map((id, index) => (
            <li key={id} className='auth-stage'>
              <span className='auth-stage-num'>{String(index + 1).padStart(2, '0')}</span>
              <span className='auth-stage-name'>{tLanding(`stages.${id}`)}</span>
            </li>
          ))}
        </ol>

        <p className='auth-showcase-wordmark' aria-hidden='true'>
          <span>surv</span>
          <span className='ai'>ai</span>
        </p>
      </div>
    </aside>
  );
}
