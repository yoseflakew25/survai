import type { Metadata } from 'next';

import { BoardPage } from '@/features/board/components/board-page';

export const metadata: Metadata = {
  title: 'Survai · Design smarter surveys. Make better decisions.',
  description:
    'An AI-powered platform that helps organizations design better surveys, collect quality data, analyze results, and generate actionable reports.'
};

export default function Page() {
  return <BoardPage />;
}
