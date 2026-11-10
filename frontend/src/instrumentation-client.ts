// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

// Next.js/React Turbopack can call performance.measure with a negative end time
// when parallel-route defaults / redirects abort before children finish timing
// (dev-only overlay crash: ParallelRouteDefault negative time stamp).
if (process.env.NODE_ENV === 'development') {
  const originalMeasure = performance.measure.bind(performance);
  performance.measure = ((...args: Parameters<typeof originalMeasure>) => {
    try {
      return originalMeasure(...args);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('negative time stamp')
      ) {
        return undefined as unknown as PerformanceMeasure;
      }
      throw error;
    }
  }) as typeof performance.measure;
}

if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adds request headers and IP for users, for more info visit
    sendDefaultPii: true,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false
  });
}

// Required by Next.js to instrument router transitions for Sentry tracing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Sentry SDK v10 typing mismatch
export const onRouterTransitionStart = (Sentry as any).captureRouterTransitionStart;
