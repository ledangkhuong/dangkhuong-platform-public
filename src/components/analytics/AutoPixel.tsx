import { headers } from "next/headers";
import { getPixelsForPathname } from "@/lib/landing-pages";
import PagePixelClient from "./PagePixelClient";

/**
 * <AutoPixel /> — Auto-bind Pixel theo pathname từ DB.
 *
 * Render trong root layout. Đọc current pathname từ header `x-dk-pathname`
 * (do middleware set), sau đó query DB và render Pixel cho từng config matching.
 *
 * Cách load Pixel:
 * 1. Render 1 inline <script> đầu trang (chuẩn Meta) cho mỗi pixel — script
 *    chạy NGAY khi parse, không phụ thuộc React hydration. Script tự check
 *    consent + auto-accept trên sales landings → init fbq + PageView.
 * 2. Render PagePixelClient bên cạnh để xử lý SPA route changes + CAPI relay.
 */
export default async function AutoPixel() {
  const h = await headers();
  const pathname = h.get("x-dk-pathname");
  if (!pathname) return null;

  const pixels = await getPixelsForPathname(pathname);
  if (pixels.length === 0) return null;

  return (
    <>
      {pixels.map((p) => {
        // Inline script: Meta Pixel base + auto-consent + init
        //
        // QUYẾT ĐỊNH KIẾN TRÚC: AutoPixel chỉ render khi pixel_config đã được
        // marketing chủ động attach (qua landing_pages hoặc apply_to_all_pages
        // = true). Đó là tín hiệu opted-in track — nên auto-accept consent
        // marketing trên page này, không phụ thuộc user click banner.
        // (Banner CookieConsent vẫn hiển thị trên các trang không có pixel.)
        const inlineScript = `(function(){
// Auto-accept marketing consent — site owner đã opt-in qua admin pixel config
try {
  var prefs = localStorage.getItem('dk_cookie_preferences');
  if (!prefs || !JSON.parse(prefs).marketing) {
    var ok = { essential: true, analytics: true, marketing: true };
    localStorage.setItem('dk_cookie_preferences', JSON.stringify(ok));
    localStorage.setItem('dk_cookie_consent', 'accepted');
    window.dispatchEvent(new Event('dk_cookie_consent_change'));
  }
} catch(e) {}

function loadPixel${p.pixel_id}(){
  if(window.fbq&&window.fbq.getState){var ps=window.fbq.getState().pixels||[];for(var i=0;i<ps.length;i++){if(ps[i].id==='${p.pixel_id}')return;}}
  !function(f,b,e,v,n,t,s){if(f.fbq){n=f.fbq}else{n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];if(s&&s.parentNode){s.parentNode.insertBefore(t,s)}else{b.head.appendChild(t)}}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init','${p.pixel_id}');
  window.fbq('track','PageView');
}
loadPixel${p.pixel_id}();
})();`;

        return (
          <span key={p.id}>
            <script
              dangerouslySetInnerHTML={{ __html: inlineScript }}
              suppressHydrationWarning
            />
            <noscript
              dangerouslySetInnerHTML={{
                __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${p.pixel_id}&ev=PageView&noscript=1" alt="" />`,
              }}
            />
            <PagePixelClient
              slug={p.slug}
              pixelId={p.pixel_id}
              hasCapi={Boolean(p.capi_access_token)}
            />
          </span>
        );
      })}
    </>
  );
}
