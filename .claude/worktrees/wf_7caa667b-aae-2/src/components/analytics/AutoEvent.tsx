import { headers } from "next/headers";
import { getLandingEventConfig } from "@/lib/landing-pages";

/**
 * <AutoEvent /> — Server component đọc landing config theo pathname rồi
 * emit inline <script> để tự fire Meta Standard Event:
 *   1. page_event — fire ngay khi user mở trang (ngoài PageView mặc định)
 *   2. form_submit_event — fire khi user submit BẤT KỲ form nào trên page
 *
 * Marketing không cần code, chỉ cần config trong /admin/pixel-settings/pages.
 */
export default async function AutoEvent() {
  const h = await headers();
  const pathname = h.get("x-dk-pathname");
  if (!pathname) return null;

  const cfg = await getLandingEventConfig(pathname);
  if (!cfg) return null;
  if (!cfg.pageEvent && !cfg.formSubmitEvent) return null;

  // Build custom_data từ event config
  const customData: Record<string, unknown> = {};
  if (cfg.contentName) customData.content_name = cfg.contentName;
  if (typeof cfg.value === "number" && cfg.value > 0) {
    customData.value = cfg.value;
    customData.currency = cfg.currency || "VND";
  }

  // Escape closing script tags to prevent XSS breakout from user-controlled data.
  // JSON.stringify does NOT escape "</script>" — replace "</" with "<\/" so the
  // browser's HTML parser cannot see a closing tag inside the script block.
  const jsonCfg = JSON.stringify({
    pageEvent: cfg.pageEvent,
    formSubmitEvent: cfg.formSubmitEvent,
    customData,
    slug: cfg.slug || "default",
  }).replace(/</g, "\\u003c");

  const script = `(function(){
if (window.__dkAutoEventBound) return;
var cfg = ${jsonCfg};
window.__dkAutoEventBound = true;

function genId(prefix){
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
}

function fire(eventName, customData, userData) {
  if (!eventName) return;
  var eventId = genId(eventName.toLowerCase());

  // 1) Client Pixel — phân biệt Standard vs Custom (AutoEvent dropdown chỉ
  // cho chọn Standard, nhưng vẫn dùng helper để consistent với các tracker khác)
  try {
    if (typeof window.fbq === 'function') {
      var STANDARD_EVENTS = ['AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration','Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout','Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication','Subscribe','ViewContent','PageView'];
      var method = STANDARD_EVENTS.indexOf(eventName) > -1 ? 'track' : 'trackCustom';
      window.fbq(method, eventName, customData || {}, { eventID: eventId });
    }
  } catch(e) {}

  // 2) Server CAPI
  try {
    var url = new URL(window.location.href);
    var sp = url.searchParams;
    var attribution = {
      utm_source: sp.get('utm_source') || undefined,
      utm_medium: sp.get('utm_medium') || undefined,
      utm_campaign: sp.get('utm_campaign') || undefined,
      utm_term: sp.get('utm_term') || undefined,
      utm_content: sp.get('utm_content') || undefined,
      fbclid: sp.get('fbclid') || undefined,
      gclid: sp.get('gclid') || undefined,
      ttclid: sp.get('ttclid') || undefined,
      referrer: document.referrer || undefined,
      landing_path: url.pathname
    };
    // EMQ Boost B — merge cached user_data (email/phone user đã nhập)
    var cachedUd = {};
    try { cachedUd = JSON.parse(sessionStorage.getItem('dk_user_data') || '{}'); } catch(e) {}
    var mergedUd = userData || {};
    if (cachedUd.email && !mergedUd.email) mergedUd.email = cachedUd.email;
    if (cachedUd.phone && !mergedUd.phone) mergedUd.phone = cachedUd.phone;
    if (cachedUd.name && !mergedUd.name) mergedUd.name = cachedUd.name;
    var hasUd = mergedUd.email || mergedUd.phone || mergedUd.name;
    fetch('/api/capi/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        slug: cfg.slug,
        event_name: eventName,
        event_id: eventId,
        user_data: hasUd ? mergedUd : undefined,
        custom_data: customData || undefined,
        source_url: window.location.href,
        attribution: attribution
      })
    }).catch(function(){});
  } catch(e) {}
}

function getUserDataFromForm(form) {
  try {
    var fd = new FormData(form);
    var email = fd.get('email'); email = email ? String(email).trim() : '';
    var phone = fd.get('phone'); phone = phone ? String(phone).trim() : '';
    var name = fd.get('name') || fd.get('full_name') || fd.get('fullname');
    name = name ? String(name).trim() : '';
    if (!email && !phone && !name) return null;
    return { email: email || undefined, phone: phone || undefined, name: name || undefined };
  } catch(e) { return null; }
}

// ── 1. Page event — fire khi user mở trang ──
if (cfg.pageEvent) {
  // Delay nhẹ để Pixel base code init xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ fire(cfg.pageEvent, cfg.customData); }, 300); });
  } else {
    setTimeout(function(){ fire(cfg.pageEvent, cfg.customData); }, 300);
  }
}

// ── 2. Form submit event — fire khi BẤT KỲ form nào submit ──
if (cfg.formSubmitEvent) {
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.nodeName !== 'FORM') return;
    // Bỏ qua form có data-dk-track riêng (để tránh fire 2 lần)
    if (form.hasAttribute && form.hasAttribute('data-dk-track')) return;
    // Bỏ qua form có data-dk-no-auto-event (opt-out)
    if (form.hasAttribute && form.hasAttribute('data-dk-no-auto-event')) return;
    var ud = getUserDataFromForm(form);
    fire(cfg.formSubmitEvent, cfg.customData, ud);
  }, true);
}
})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
