'use client';

import type { ReactNode } from 'react';

import { SurveyActivityProvider } from '@/features/surveys/components/survey-activity-provider';

/** Client shell so the survey layout can host the activity modal provider. */
export function SurveyWorkspaceShell({ children }: { children: ReactNode }) {
  return <SurveyActivityProvider>{children}</SurveyActivityProvider>;
}
