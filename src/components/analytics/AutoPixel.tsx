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

  // Sales landings — auto-accept marketing consent (visitor đến từ ads, ngầm
  // chấp nhận tracking). Khớp với HIDE_ON_PATHS trong CookieConsent.tsx.
  const SALES_PATHS = [
    "/hocchuaxongtiendave",
    "/updateveo3.1",
    "/updateveo3",
    "/slowenglish",
    "/sanphamso",
    "/cafe",
    "/weballinone",
  ];
  const isOnSalesPath = SALES_PATHS.some((p) => pathname.startsWith(p));

  return (
    <>
      {pixels.map((p) => {
        // Inline script: Meta Pixel base + consent gate + init
        const inlineScript = `(function(){
var prefs=null;try{prefs=localStorage.getItem('dk_cookie_preferences');}catch(e){}
${
  isOnSalesPath
    ? `if(!prefs){var ok={essential:true,analytics:true,marketing:true};try{localStorage.setItem('dk_cookie_preferences',JSON.stringify(ok));localStorage.setItem('dk_cookie_consent','accepted');}catch(e){}prefs=JSON.stringify(ok);}`
    : ""
}
var consent=false;try{consent=!!(prefs&&JSON.parse(prefs).marketing);}catch(e){}
if(!consent){
  window.addEventListener('dk_cookie_consent_change',function(){
    try{var p=JSON.parse(localStorage.getItem('dk_cookie_preferences')||'null');if(p&&p.marketing&&!window.fbq){loadPixel${p.pixel_id}();}}catch(e){}
  });
  return;
}
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
