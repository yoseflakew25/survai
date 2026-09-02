'use client';

import { useCallback, useRef, useState } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T), options?: { addToHistory?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  getHistorySize: () => number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistory = 50 } = options;

  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  // Use refs for immediate access in callbacks
  const stateRef = useRef(undoRedoState);
  stateRef.current = undoRedoState;

  const setState = useCallback(
    (
      newState: T | ((prev: T) => T),
      opts?: { addToHistory?: boolean }
    ) => {
      const { addToHistory = true } = opts ?? {};

      setUndoRedoState((current) => {
        const newPresent =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(current.present)
            : newState;

        // Skip if value hasn't changed
        if (newPresent === current.present) return current;

        if (!addToHistory) {
          return { ...current, present: newPresent };
        }

        const newPast = [...current.past, current.present].slice(-maxHistory);

        return {
          past: newPast,
          present: newPresent,
          future: [] // Clear future on new action
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setUndoRedoState((current) => {
      if (current.past.length === 0) return current;

      const newPast = [...current.past];
      const previous = newPast.pop()!;

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setUndoRedoState((current) => {
      if (current.future.length === 0) return current;

      const newFuture = [...current.future];
      const next = newFuture.shift()!;

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setUndoRedoState((current) => ({
      past: [],
      present: current.present,
      future: []
    }));
  }, []);

  const getHistorySize = useCallback(() => {
    return stateRef.current.past.length + stateRef.current.future.length + 1;
  }, []);

  return {
    state: undoRedoState.present,
    setState,
    undo,
    redo,
    canUndo: undoRedoState.past.length > 0,
    canRedo: undoRedoState.future.length > 0,
    clearHistory,
    getHistorySize
  };
}
