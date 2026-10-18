import { BoardHeader } from '@/features/board/components/board-header';
import { BoardHero } from '@/features/board/components/board-hero';
import { LandingAudience } from '@/features/board/components/landing-audience';
import { LandingCollectStrip } from '@/features/board/components/landing-collect-strip';
import { LandingContrast } from '@/features/board/components/landing-contrast';
import { LandingCta } from '@/features/board/components/landing-cta';
import { LandingDemo } from '@/features/board/components/landing-demo';
import { LandingFaq } from '@/features/board/components/landing-faq';
import { LandingFooter } from '@/features/board/components/landing-footer';
import { LandingLifecycle } from '@/features/board/components/landing-lifecycle';
import { LandingPrinciples } from '@/features/board/components/landing-principles';
import { LandingTrust } from '@/features/board/components/landing-trust';
import '@/features/board/styles.css';

export function BoardPage() {
  return (
    <div className='lp min-h-screen'>
      <BoardHeader />
      <main className='rise mx-auto w-full max-w-[760px] px-4 pt-4 pb-2 sm:px-6 sm:pt-6'>
        <BoardHero />
      </main>
      <div className='mx-auto w-full max-w-3xl px-4 pb-8 sm:px-6 lg:max-w-4xl'>
        <LandingLifecycle />
        <LandingContrast />
        <LandingTrust />
        <LandingDemo />
        <LandingCollectStrip />
        <LandingPrinciples />
        <LandingAudience />
        <LandingFaq />
        <LandingCta />
      </div>
      <LandingFooter />
    </div>
  );
}
