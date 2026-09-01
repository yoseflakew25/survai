import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      spotlight: process.env.NODE_ENV === 'development',
      sendDefaultPii: true,
      tracesSampleRate: 1,
      debug: false
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
