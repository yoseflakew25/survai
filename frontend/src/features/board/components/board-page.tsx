import { BoardHeader } from '@/features/board/components/board-header';
import { BoardHero } from '@/features/board/components/board-hero';
import '@/features/board/styles.css';

export function BoardPage() {
  return (
    <div className='lp min-h-screen'>
      <BoardHeader />
      <main className='rise mx-auto w-full max-w-[720px] px-4 pt-6 pb-24 sm:px-6 sm:pt-8'>
        <BoardHero />
      </main>
    </div>
  );
}
