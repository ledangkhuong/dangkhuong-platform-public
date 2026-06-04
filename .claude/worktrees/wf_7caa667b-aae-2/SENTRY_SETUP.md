# Sentry Error Monitoring Setup

## 1. Install dependency

```bash
npm install @sentry/nextjs
```

## 2. Environment variables

Add these to `.env.local` (and your hosting provider's dashboard):

```env
# Required — your Sentry project DSN
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0

# Required for source-map uploads during build
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=dangkhuong-platform
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

Get these values from **Sentry > Settings > Projects > dangkhuong-platform > Client Keys (DSN)**.

## 3. Wrap next.config.ts with withSentryConfig

Edit `next.config.ts`:

```ts
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ... existing config
};

export default withSentryConfig(nextConfig, {
  // Upload source maps for better stack traces
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hide source maps from the client
  hideSourceMaps: true,
});
```

## 4. Update Content-Security-Policy (if applicable)

Add Sentry domains to the `connect-src` directive in `next.config.ts` headers:

```
connect-src 'self' ... https://*.ingest.sentry.io;
```

## 5. Use the ErrorBoundary component

Wrap sections of your app that should catch rendering errors:

```tsx
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

## 6. Test the integration

1. Start the dev server: `npm run dev`
2. Set `NEXT_PUBLIC_SENTRY_DSN` to your real DSN
3. Trigger a test error in the browser console:

```js
throw new Error("Sentry test error");
```

4. Or add a temporary test button:

```tsx
<button onClick={() => { throw new Error("Sentry test"); }}>
  Test Sentry
</button>
```

5. Check Sentry dashboard for the error

## Files created

| File | Purpose |
|---|---|
| `src/lib/monitoring/sentry.ts` | Shared Sentry config utility |
| `sentry.client.config.ts` | Client-side initialization (browser tracing + replay) |
| `sentry.server.config.ts` | Server-side initialization (Node.js runtime) |
| `sentry.edge.config.ts` | Edge runtime initialization |
| `src/components/providers/ErrorBoundary.tsx` | React Error Boundary with Sentry reporting |

## Notes

- Sentry is **disabled** when `NEXT_PUBLIC_SENTRY_DSN` is not set (safe for local dev).
- Production `tracesSampleRate` is 0.1 (10%) to control costs. Adjust as needed.
- Session replay captures 1% of sessions normally, 100% on error.
- The ErrorBoundary shows Vietnamese UI text matching the platform language.
