# Google Analytics 4 (GA4) Setup Guide

## 1. Get your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/).
2. Click **Admin** (gear icon, bottom-left).
3. In the **Property** column, click **Data Streams**.
4. Select your web stream (or create one for `dangkhuong.com`).
5. Copy the **Measurement ID** -- it looks like `G-XXXXXXXXXX`.

## 2. Set the environment variable

Add the measurement ID to your `.env.local` (local dev) or your hosting
provider's environment variables (production):

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

The `NEXT_PUBLIC_` prefix is required so Next.js exposes the value to the
browser bundle.

## 3. Add GoogleAnalytics to the root layout

In `src/app/layout.tsx`, import and render the server component. It should
be placed inside `<body>`, alongside the existing analytics components:

```tsx
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

// Inside the <body> tag:
<GoogleAnalytics />
```

Since `GoogleAnalytics` is a server component, it does **not** need to be
wrapped in `<Suspense>`.

## 4. Add AnalyticsProvider to the root layout

`AnalyticsProvider` is a client component that tracks page views on route
changes and reports Web Vitals. Wrap it in a `<Suspense>` boundary (it
uses `useSearchParams`):

```tsx
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";

// Inside the <body> tag, within the existing <Suspense>:
<Suspense fallback={null}>
  <PageTracker />
  <FacebookPixel />
  <AffiliateTracker />
  <AnalyticsProvider />
</Suspense>
```

## 5. E-commerce tracking

The `src/lib/gtag.ts` module exports helpers for GA4 e-commerce events.

### Track a purchase

```ts
import { trackPurchase } from "@/lib/gtag";

trackPurchase(
  "ORDER_123",   // transaction ID
  499000,        // value
  "VND",         // currency (default)
  [
    {
      item_id: "COURSE_001",
      item_name: "Khoa hoc Video AI",
      price: 499000,
      quantity: 1,
    },
  ],
);
```

### Track begin checkout

```ts
import { trackBeginCheckout } from "@/lib/gtag";

trackBeginCheckout(499000, [
  {
    item_id: "COURSE_001",
    item_name: "Khoa hoc Video AI",
    price: 499000,
    quantity: 1,
  },
]);
```

### Track any custom event

```ts
import { event } from "@/lib/gtag";

event("sign_up", { method: "email" });
event("share", { content_type: "course", item_id: "COURSE_001" });
```

## 6. Web Vitals

Web Vitals (CLS, FID, FCP, LCP, TTFB, INP) are automatically collected by
the `<AnalyticsProvider />` component and forwarded to GA4 as custom
events. In development mode they are also logged to the browser console.

To view them in Google Analytics, go to **Reports > Realtime** or create a
custom exploration filtering by the event names (CLS, LCP, etc.).

## 7. Verify the integration

1. Start the dev server with the env variable set.
2. Open the site in Chrome and open DevTools > Console. You should see
   `[WebVital]` log lines.
3. In Google Analytics, open **Reports > Realtime** to confirm events
   are arriving.
4. Use the [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
   Chrome extension for detailed debugging.
