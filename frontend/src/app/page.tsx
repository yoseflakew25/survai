import type { Metadata } from 'next';

import { BoardPage } from '@/features/board/components/board-page';

export const metadata: Metadata = {
  title: 'Survai: AI-assisted surveys, from first question to donor-ready report',
  description:
    'Survai is an AI-assisted survey platform for program, research, and policy teams. Plan, build, collect, analyze, and turn responses into donor-ready reports in one place, with people in control of every edit and every number.',
  openGraph: {
    title: 'Survai: surveys to donor-ready reports',
    description:
      'Plan, build, collect, analyze, and report in one place. AI does the heavy lifting, your team signs off on every edit and every number.'
  }
};

export default function Page() {
  return <BoardPage />;
}
