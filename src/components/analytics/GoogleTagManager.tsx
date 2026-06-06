import Script from "next/script";

// ---------------------------------------------------------------------------
// Google Tag Manager
// ---------------------------------------------------------------------------
// Two-part integration:
//   1. <GoogleTagManager />          → injects the GTM JS snippet in <head>
//                                      via next/script (afterInteractive).
//   2. <GoogleTagManagerNoscript />  → injects the <noscript><iframe>
//                                      fallback near the top of <body>.
//
// Both components are SSR-safe (no "use client" needed — they only render
// markup and do not use any React hooks or browser-only APIs).
//
// Reads NEXT_PUBLIC_GTM_ID. When the env var is not set, both components
// render `null` so production builds without GTM ship zero overhead.
// ---------------------------------------------------------------------------

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export const IS_GTM_ENABLED = Boolean(GTM_ID);

/**
 * Emits the Google Tag Manager <head> snippet.
 *
 * Uses next/script with strategy="afterInteractive" so the GTM container
 * loads early but does not block initial hydration.
 *
 * Mount once in the root layout — placement should be near the closing
 * </body> tag (next/script will hoist it appropriately).
 */
export function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <Script
      id="gtm-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
      }}
    />
  );
}

/**
 * Emits the GTM <noscript> <iframe> fallback so that visitors who have
 * JavaScript disabled still trigger pageview tags.
 *
 * Mount inside the <body>, ideally as one of the first children, per
 * Google's official installation guide.
 */
export function GoogleTagManagerNoscript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}

export default GoogleTagManager;
