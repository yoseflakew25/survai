import { useSyncExternalStore } from 'react';

function subscribeNoop() {
  return () => {};
}

/** True after hydration; false on the server. Avoids setState-in-effect for theme/logo. */
export function useClientMounted() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}
