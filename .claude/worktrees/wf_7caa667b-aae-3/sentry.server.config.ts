// @ts-nocheck
// NOTE: Install @sentry/nextjs before enabling: npm install @sentry/nextjs
import * as Sentry from "@sentry/nextjs";
import { getSentryConfig } from "@/lib/monitoring/sentry";

const config = getSentryConfig();
if (config.enabled) {
  Sentry.init(config);
}
