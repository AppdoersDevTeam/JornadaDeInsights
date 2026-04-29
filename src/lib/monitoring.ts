import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.MODE || 'development';

let initialized = false;

export const initClientMonitoring = () => {
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
  });
  initialized = true;
};

export const captureClientError = (error: unknown, context?: Record<string, unknown>) => {
  if (!dsn) return;
  Sentry.captureException(error, {
    extra: context,
  });
};
