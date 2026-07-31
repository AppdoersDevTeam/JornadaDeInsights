import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

let initialized = false;

const ensureInit = () => {
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
  });
  initialized = true;
};

export const captureServerError = (error, context = {}) => {
  if (!dsn) return;
  ensureInit();
  Sentry.captureException(error, {
    extra: context,
  });
};
