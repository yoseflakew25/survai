'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

import { SurveyActivityModal } from '@/features/surveys/components/survey-activity-modal';
import type { SurveyActivityId } from '@/features/surveys/lib/activity-scripts';

type RunOptions = {
  previewText?: string;
};

type SurveyActivityContextValue = {
  activeId: SurveyActivityId | null;
  open: (id: SurveyActivityId, options?: RunOptions) => void;
  close: () => void;
  run: <T>(
    id: SurveyActivityId,
    fn: () => Promise<T>,
    options?: RunOptions
  ) => Promise<T>;
};

const SurveyActivityContext = createContext<SurveyActivityContextValue | null>(
  null
);

export function SurveyActivityProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<SurveyActivityId | null>(null);
  const [previewText, setPreviewText] = useState<string | undefined>();
  const runningRef = useRef(false);

  const open = useCallback((id: SurveyActivityId, options?: RunOptions) => {
    setPreviewText(options?.previewText);
    setActiveId(id);
  }, []);

  const close = useCallback(() => {
    if (runningRef.current) return;
    setActiveId(null);
    setPreviewText(undefined);
  }, []);

  const run = useCallback(
    async <T,>(
      id: SurveyActivityId,
      fn: () => Promise<T>,
      options?: RunOptions
    ): Promise<T> => {
      runningRef.current = true;
      setPreviewText(options?.previewText);
      setActiveId(id);
      try {
        return await fn();
      } finally {
        runningRef.current = false;
        setActiveId(null);
        setPreviewText(undefined);
      }
    },
    []
  );

  const value = useMemo(
    () => ({ activeId, open, close, run }),
    [activeId, open, close, run]
  );

  return (
    <SurveyActivityContext.Provider value={value}>
      {children}
      <SurveyActivityModal
        activityId={activeId}
        open={activeId !== null}
        previewText={previewText}
      />
    </SurveyActivityContext.Provider>
  );
}

export function useSurveyActivity(): SurveyActivityContextValue {
  const ctx = useContext(SurveyActivityContext);
  if (!ctx) {
    throw new Error(
      'useSurveyActivity must be used within SurveyActivityProvider'
    );
  }
  return ctx;
}
