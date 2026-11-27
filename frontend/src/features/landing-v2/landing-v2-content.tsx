'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ComponentProps, type ReactNode } from 'react';
import { SurvaiLogo } from '@/components/survai-logo';
import { LandingV2Footer } from '@/features/landing-v2/landing-v2-footer';
import { HeroMediaCell } from '@/features/landing-v2/hero-media-cell';
import { HeroPlanPrompt } from '@/features/landing-v2/hero-plan-prompt';
import { heroMediaTop } from '@/features/landing-v2/hero-media';
import { LandingCtaSplit } from '@/features/landing-v2/landing-v2-cta-split';
import {
  LANDING_HEADER_NAV,
  LANDING_NAV
} from '@/features/landing-v2/landing-v2-nav';
import { LandingNavLinks } from '@/features/landing-v2/landing-v2-nav-links';
import { LandingLanguageSwitcher } from '@/features/landing-v2/landing-v2-language-switcher';
import { LandingSectionHead } from '@/features/landing-v2/landing-v2-section-head';

type Props = {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
};

function SignUpLink({ className, children, ...rest }: Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link href='/auth/sign-up' className={className} {...rest}>
      {children}
    </Link>
  );
}

const STAGE_IDS = ['plan', 'build', 'review', 'collect', 'analyze', 'report'] as const;
const TRUST_IDS = ['speed', 'evidence', 'approval'] as const;
const PRINCIPLE_IDS = ['decide', 'numbers', 'simple', 'respect'] as const;
const AUDIENCE_IDS = ['me', 'cso', 'research', 'leaders'] as const;
const AUDIENCE_LETTERS = ['A', 'B', 'C', 'D'] as const;
const FAQ_IDS = ['problem', 'numbers', 'account', 'who', 'ready'] as const;
const COLLECT_BEATS = ['draft', 'publish', 'share', 'close'] as const;

function lifecycleTitleHl(chunks: ReactNode) {
  return <span className='work-heading-hl'>{chunks}</span>;
}

const HEADER_NAV = LANDING_NAV.filter((item) =>
  (LANDING_HEADER_NAV as readonly string[]).includes(item.id)
);

const CtaArrow = () => (
  <svg className='arr' viewBox='0 0 16 16' aria-hidden='true'>
    <path d='M1 8h13M9 3l5 5-5 5' />
  </svg>
);

const WORKFLOW_ART: Record<(typeof STAGE_IDS)[number], string> = {
  plan: 'art-plan',
  build: 'art-build',
  review: 'art-build',
  collect: 'art-collect',
  analyze: 'art-analyze',
  report: 'art-report'
};

function WorkflowArt({ id }: { id: (typeof STAGE_IDS)[number] }) {
  if (id === 'plan') {
    return (
      <svg viewBox='0 0 180 180' className={`art ${WORKFLOW_ART[id]}`}>
        <circle cx='90' cy='90' r='88' className='dash' />
        <g className='spin'>
          <ellipse cx='90' cy='90' rx='30' ry='45' />
          <ellipse cx='90' cy='90' rx='45' ry='30' />
          <ellipse cx='90' cy='90' rx='60' ry='20' />
          <ellipse cx='90' cy='90' rx='20' ry='60' />
          <ellipse cx='90' cy='90' rx='75' ry='10' />
          <ellipse cx='90' cy='90' rx='10' ry='75' />
        </g>
      </svg>
    );
  }
  if (id === 'build' || id === 'review') {
    return (
      <svg viewBox='0 0 180 180' className={`art ${WORKFLOW_ART[id]}`}>
        <rect x='1' y='1' width='178' height='178' className='dash' />
        <g className='stack'>
          <rect x='30' y='28' width='120' height='22' rx='3' />
          <rect x='30' y='62' width='96' height='22' rx='3' />
          <rect x='30' y='96' width='120' height='22' rx='3' />
          <rect x='30' y='130' width='70' height='22' rx='3' />
        </g>
        <path d='M18 39h6M18 73h6M18 107h6M18 141h6' />
      </svg>
    );
  }
  if (id === 'collect') {
    return (
      <svg viewBox='0 0 180 180' className={`art ${WORKFLOW_ART[id]}`}>
        <circle cx='90' cy='90' r='88' />
        <g className='rays' />
        <circle cx='90' cy='90' r='4' className='fill' />
        <circle cx='90' cy='90' r='10' />
      </svg>
    );
  }
  if (id === 'analyze') {
    return (
      <svg viewBox='0 0 180 180' className={`art ${WORKFLOW_ART[id]}`}>
        <circle cx='90' cy='90' r='88' className='dash' />
        <g className='bars'>
          <rect x='42' y='100' width='14' height='40' />
          <rect x='62' y='80' width='14' height='60' />
          <rect x='82' y='60' width='14' height='80' />
          <rect x='102' y='88' width='14' height='52' />
          <rect x='122' y='48' width='14' height='92' />
        </g>
        <path d='M34 140h112' />
      </svg>
    );
  }
  return (
    <svg viewBox='0 0 180 180' className={`art ${WORKFLOW_ART[id]}`}>
      <circle cx='90' cy='90' r='80' className='dash' />
      <circle cx='90' cy='90' r='86' className='dash' />
      <rect x='58' y='44' width='64' height='92' rx='2' />
      <path className='ln' d='M68 60h44M68 72h44M68 84h30M68 104h44M68 116h22' />
      <g className='orbit'>
        <rect x='166' y='86' width='7' height='7' className='fill' />
      </g>
      <g className='orbit o2'>
        <rect x='7' y='86' width='7' height='7' className='fill' />
      </g>
    </svg>
  );
}

export function LandingV2Content({ menuOpen, onMenuToggle, onMenuClose }: Props) {
  const t = useTranslations('landing');
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <>
      <a className='skip' href='#main'>
        {t('nav.skipToContent')}
      </a>

      <div id='top' className='landing-scroll-top' tabIndex={-1} aria-hidden='true' />

      <header className='hdr'>
        <div className='hdr-left'>
          <a className='hdr-logo' href='#top' aria-label={t('nav.home')}>
            <SurvaiLogo className='hdr-wordmark' />
          </a>
        </div>
        <div className='hdr-right'>
          <nav className='hdr-nav' aria-label='Main'>
            <LandingNavLinks items={HEADER_NAV} variant='header' />
          </nav>
          <button
            className='menu-btn'
            type='button'
            aria-expanded={menuOpen}
            aria-controls='menu'
            onClick={onMenuToggle}
          >
            <span className='m-open'>{t('nav.menu')}</span>
            <span className='m-close'>{t('nav.menuClose')}</span>
          </button>
          <LandingLanguageSwitcher />
          <Link href='/auth/sign-in' className='hdr-signin'>
            <span className='roll'>
              <span>{t('nav.signIn')}</span>
              <span>{t('nav.signIn')}</span>
            </span>
          </Link>
          <SignUpLink className='hdr-contact'>
            <span className='roll'>
              <span>{t('nav.createAccount')}</span>
              <span>{t('nav.createAccount')}</span>
            </span>
            <svg className='arr' viewBox='0 0 16 16' aria-hidden='true'>
              <path d='M1 8h13M9 3l5 5-5 5' />
            </svg>
          </SignUpLink>
        </div>
      </header>

      <div className='menu' id='menu' hidden={!menuOpen}>
        <nav aria-label='Mobile'>
          <LandingNavLinks items={LANDING_NAV} onNavigate={onMenuClose} variant='mobile' />
          <Link href='/auth/sign-in' onClick={onMenuClose}>
            {t('nav.signIn')}
          </Link>
          <SignUpLink onClick={onMenuClose}>
            {t('nav.createAccount')}
          </SignUpLink>
        </nav>
        <div className='menu-lang'>
          <LandingLanguageSwitcher onSelect={onMenuClose} />
        </div>
      </div>

      <main id='main'>
        <section className='hero' data-scene>
          <div className='hero-r1'>
            <div className='cell cell-white hero-word-cell'>
              <div className='hero-word-stack'>
                <p className='hero-welcome'>{t('hero.welcomeTo')}</p>
                <h1 className='hero-word ' aria-label={t('hero.badgeName')}>
                  <span className='hero-surv'>surv</span>
                  <span className='hero-ai'>ai</span>
                </h1>
              </div>
            </div>
            <div className='cell hero-media-cell-wrap'>
              <HeroMediaCell
                kind={heroMediaTop.kind}
                srcs={heroMediaTop.srcs}
                toneBig={heroMediaTop.toneBig}
                label={t('hero.videoTopLabel')}
              />
            </div>
          </div>
          <div className='hero-r2'>
            <div className='hero-pair'>
              <div className='cell cell-mint hero-box hero-box-copy'>
                <div className='fade'>
                  <p className='t-body30'>{t('hero.panelTitle1')}</p>
                  <p className='t-body30'>{t('hero.panelTitle2')}</p>
                  <p className='hero-box-desc'>{t('hero.panelBody')}</p>
                </div>
                <div className='hero-art' aria-hidden='true'>
                  <WorkflowArt id='build' />
                </div>
                <LandingCtaSplit
                  className='hero-cta-split fade'
                  primary={
                    <SignUpLink className='btn-dark'>
                      <span className='roll'>
                        <span>{t('nav.createAccount')}</span>
                        <span>{t('nav.createAccount')}</span>
                      </span>
                      <CtaArrow />
                    </SignUpLink>
                  }
                  secondary={
                    <a className='mono-link landing-cta-secondary' href='#lifecycle'>
                      <span className='roll'>
                        <span>{t('hero.seeHow')}</span>
                        <span>{t('hero.seeHow')}</span>
                      </span>
                      <CtaArrow />
                    </a>
                  }
                />
              </div>
            </div>
            <div className='cell hero-plan-cell'>
              <HeroPlanPrompt />
            </div>
          </div>
        </section>

        <section className='challenge' id='about'>
          <LandingSectionHead
            variant='about'
            kicker={t('aboutUs.label')}
            title={
              <h2 className='section-head-title section-head-title-lines'>
                <span>{t('aboutUs.title')}</span>
                <span>{t('aboutUs.titleLine2')}</span>
              </h2>
            }
            body={
              <div className='section-head-body section-head-body-stack'>
                <p>{t('aboutUs.lead')}</p>
                <p>{t('aboutUs.mission')}</p>
                <p>{t('aboutUs.audience')}</p>
              </div>
            }
          />
          <div className='challenge-compare' id='compare'>
            <article className='challenge-side cell-grey'>
              <div className='challenge-side-head'>
                <p className='label section-kicker'>
                  <i />
                  {t('challenge.currentLabel')}
                </p>
                <p className='challenge-verdict'>{t('challenge.currentVerdict')}</p>
              </div>
              <ol className='challenge-points'>
                <li>
                  <span>01</span>
                  <p>{t('challenge.current1')}</p>
                </li>
                <li>
                  <span>02</span>
                  <p>{t('challenge.current2')}</p>
                </li>
                <li>
                  <span>03</span>
                  <p>{t('challenge.current3')}</p>
                </li>
              </ol>
            </article>
            <article className='challenge-side cell-mint'>
              <div className='challenge-side-head'>
                <p className='label section-kicker'>
                  <i />
                  {t('challenge.withLabel')}
                </p>
                <p className='challenge-verdict'>{t('challenge.withVerdict')}</p>
              </div>
              <ol className='challenge-points'>
                <li>
                  <span>01</span>
                  <p>{t('challenge.with1')}</p>
                </li>
                <li>
                  <span>02</span>
                  <p>{t('challenge.with2')}</p>
                </li>
                <li>
                  <span>03</span>
                  <p>{t('challenge.with3')}</p>
                </li>
              </ol>
            </article>
          </div>
        </section>

        <section className='work' id='lifecycle'>
          <div className='work-left cell-dark'>
            <div className='work-sticky'>
              <div className='work-intro'>
                <p className='label section-kicker'>
                  <i />
                  {t('lifecycle.label')}
                </p>
                <h2 className='work-heading'>
                  {t.rich('lifecycle.title', { hl: lifecycleTitleHl })}
                </h2>
                <p className='work-lead'>{t('lifecycle.subtitle')}</p>
              </div>
              <div className='work-meta'>
                <ol className='work-stage-index' aria-hidden='true'>
                  {STAGE_IDS.map((id, index) => (
                    <li key={id}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {t(`stages.${id}`)}
                    </li>
                  ))}
                </ol>
                <p className='work-meta-note'>{t('lifecycle.aside')}</p>
              </div>
            </div>
          </div>
          <ol className='work-list cell-dark'>
            {STAGE_IDS.map((id, index) => (
              <li className='svc' key={id}>
                <div className='svc-top'>
                  <div className='svc-head'>
                    <span className='svc-num'>{String(index + 1).padStart(2, '0')}</span>
                    <h3 className='svc-title'>
                      <span className='svc-t'>{t(`lifecycle.steps.${id}.title`)}</span>
                    </h3>
                  </div>
                  <p className='svc-desc'>{t(`lifecycle.steps.${id}.body`)}</p>
                </div>
                <div className='svc-panel'>
                  <div className='svc-art' aria-hidden='true'>
                    <WorkflowArt id={id} />
                  </div>
                  <ul className='svc-tags'>
                    <li className='svc-tag-eyebrow'>{t(`lifecycle.steps.${id}.eyebrow`)}</li>
                    <li>{t(`lifecycle.steps.${id}.line1`)}</li>
                    <li>{t(`lifecycle.steps.${id}.line2`)}</li>
                    <li>{t(`lifecycle.steps.${id}.line3`)}</li>
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className='reliability' id='trust'>
          <LandingSectionHead
            kicker={t('trust.label')}
            title={t('trust.headline')}
            body={t('trust.subtitle')}
          />
          <ol className='why-grid rel-pillars'>
            {TRUST_IDS.map((id, index) => (
              <li
                key={id}
                className={`why-card rel-pillar ${index === 1 ? 'cell-mint' : 'cell-grey'}`}
              >
                <span className='rel-pillar-num' aria-hidden='true'>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className='landing-card-title rel-pillar-title'>{t(`trust.claims.${id}.title`)}</h3>
                <p className='stat-cap rel-pillar-body'>{t(`trust.claims.${id}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className='teams' id='principles'>
          <LandingSectionHead
            kicker={t('principles.label')}
            title={t('principles.title')}
            body={t('principles.body')}
          />
          <ol className='audience-grid'>
            {PRINCIPLE_IDS.map((id, index) => (
              <li
                key={id}
                className={`audience-card ${index % 2 === 0 ? 'cell-mint' : 'cell-grey'}`}
              >
                <span className='audience-num' aria-hidden='true'>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className='landing-card-title audience-card-title'>{t(`principles.items.${id}.title`)}</h3>
                <p className='audience-card-body'>{t(`principles.items.${id}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className='collect' id='collect'>
          <LandingSectionHead
            kicker={t('collect.label')}
            title={t('collect.headline')}
            body={t('collect.subtitle')}
          />
          <ol className='audience-grid collect-grid'>
            {COLLECT_BEATS.map((id, index) => (
              <li key={id} className={`audience-card ${index % 2 === 0 ? 'cell-mint' : 'cell-grey'}`}>
                <span className='audience-tag'>{t(`collect.beats.${id}.hint`)}</span>
                <h3 className='landing-card-title audience-card-title'>{t(`collect.beats.${id}.label`)}</h3>
                <p className='audience-card-body'>{t(`collect.beats.${id}.detail`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className='audience' id='audience'>
          <LandingSectionHead
            kicker={t('audience.label')}
            title={t('audience.headline')}
            body={t('audience.subtitle')}
          />
          <ul className='audience-grid'>
            {AUDIENCE_IDS.map((id, index) => (
              <li
                key={id}
                className={`audience-card ${index % 2 === 0 ? 'cell-mint' : 'cell-grey'}`}
              >
                <span className='audience-num' aria-hidden='true'>
                  {AUDIENCE_LETTERS[index]}
                </span>
                <span className='audience-tag'>{t(`audience.items.${id}.tag`)}</span>
                <h3 className='landing-card-title audience-card-title'>{t(`audience.items.${id}.title`)}</h3>
                <p className='audience-card-body'>{t(`audience.items.${id}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className='faq' id='faq'>
          <LandingSectionHead
            kicker={t('faq.label')}
            title={t('faq.headline')}
            body={t('faq.lead')}
          />
          <div className='faq-list'>
            {FAQ_IDS.map((id, index) => {
              const open = faqOpen === index;
              return (
                <div
                  key={id}
                  className={`faq-item${open ? ' is-open' : ''}${index % 2 === 0 ? ' cell-grey' : ''}`}
                >
                  <button
                    type='button'
                    aria-expanded={open}
                    onClick={() => setFaqOpen(open ? -1 : index)}
                  >
                    <span className='faq-num' aria-hidden='true'>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className='faq-q'>{t(`faq.items.${id}.q`)}</span>
                    <span className='faq-icon' aria-hidden='true'>
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  <div className='faq-a'>
                    <div className='faq-a-inner'>
                      <p>{t(`faq.items.${id}.a`)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <LandingV2Footer />
    </>
  );
}
