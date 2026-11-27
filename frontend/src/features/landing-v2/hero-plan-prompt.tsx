'use client';

import { useTranslations } from 'next-intl';

const STAGE_IDS = ['plan', 'build', 'review', 'collect', 'analyze', 'report'] as const;

export function HeroPlanPrompt() {
  const t = useTranslations('landing');

  return (
    <div className='hero-plan'>
      <div className='hero-plan-card'>
        <div className='hero-plan-prompt'>
          <span className='hero-plan-icon' aria-hidden='true'>
            <svg viewBox='0 0 24 24'>
              <path d='M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7' />
            </svg>
          </span>
          <p className='hero-plan-question'>{t('hero.planPrompt')}</p>
          <span className='hero-plan-start'>
            {t('hero.planStart')}
            <svg viewBox='0 0 16 16' aria-hidden='true'>
              <path d='M5 3l6 5-6 5' />
            </svg>
          </span>
        </div>
        <ul className='hero-plan-suggestions'>
          <li>{t('hero.suggestion1')}</li>
          <li>{t('hero.suggestion2')}</li>
          <li>{t('hero.suggestion3')}</li>
        </ul>
      </div>
      <ol className='hero-plan-stages' aria-label={t('stages.aria')}>
        {STAGE_IDS.map((id, index) => (
          <li key={id} className={index === 0 ? 'is-active' : undefined}>
            <span>{t(`stages.${id}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
