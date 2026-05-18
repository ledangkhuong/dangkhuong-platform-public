// ──────────────────────────────────────────────
// Sentry Initialization Utility
// ──────────────────────────────────────────────
// Install: npm install @sentry/nextjs
// Set env vars: NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";
export const IS_SENTRY_ENABLED = !!SENTRY_DSN;

export function getSentryConfig() {
  return {
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    enabled: IS_SENTRY_ENABLED,
  };
}
