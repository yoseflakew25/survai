import type { Metadata } from 'next';

import { BoardPage } from '@/features/board/components/board-page';

export const metadata: Metadata = {
  title: 'Survai · Surveys you can trust',
  description:
    'AI-assisted survey lifecycle — plan, build, review, collect, analyze, and report. AI writes the language; deterministic code owns every figure.'
};

export default function Page() {
  return <BoardPage />;
}
