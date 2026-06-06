import Script from "next/script";

// ---------------------------------------------------------------------------
// Microsoft Clarity
// ---------------------------------------------------------------------------
// Reads project ID at module scope. When the env var is not set we render
// nothing, so previewing the site without analytics keys remains clean.
//
// Snippet sourced from the official Microsoft Clarity onboarding flow at
// https://clarity.microsoft.com/ — kept inline (rather than loaded via src=)
// so Clarity's bootstrap can self-initialise before the external loader.
// ---------------------------------------------------------------------------

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/**
 * Mounts the Microsoft Clarity tracking snippet using `next/script` with the
 * `afterInteractive` strategy. Returns null when `NEXT_PUBLIC_CLARITY_ID` is
 * not configured so the component is a no-op in local/preview environments.
 */
export default function MicrosoftClarity() {
  if (!CLARITY_ID) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${CLARITY_ID}");`,
      }}
    />
  );
}
