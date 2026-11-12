import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 768px)';

function subscribeMq(onStoreChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useMediaQuery() {
  const isOpen = useSyncExternalStore(subscribeMq, getSnapshot, getServerSnapshot);
  return { isOpen };
}
