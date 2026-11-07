import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dedupe identical in-flight requests + keep list UIs warm.
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1
      },
      dehydrate: {
        // Only dehydrate settled successes. Pending auth-gated prefetches
        // reject on the server (no cookies) and spam the console.
        shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query)
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
