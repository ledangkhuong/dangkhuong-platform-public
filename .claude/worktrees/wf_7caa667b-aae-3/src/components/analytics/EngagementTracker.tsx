import { headers } from "next/headers";
import { getLandingEventConfig } from "@/lib/landing-pages";
import { getPixelsForPathname } from "@/lib/landing-pages";

/**
 * <EngagementTracker /> — Server component emit inline script tự động track:
 *
 *   - ScrollDepth_25_percent / _50_percent / _75_percent / _100_percent
 *     (mỗi mốc chỉ fire 1 lần khi user scroll qua)
 *
 *   - TimeOnPage_10_seconds / _30 / _60 / _90 / _120 / _180 / _300_seconds
 *     (đặt setTimeout, fire 1 lần khi đạt mốc, cancel khi user rời trang)
 *
 * Tự động chạy trên MỌI landing có Pixel attached — không cần marketing config.
 * Mỗi event fire cả Pixel client (fbq trackCustom) + CAPI server (dedup qua event_id).
 *
 * Pixel slug được lấy từ landing_page_pixels (1 pixel đầu tiên đang active của
 * pathname này). Nếu không có pixel → component return null.
 */

const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;
const TIME_THRESHOLDS = [10, 30, 60, 90, 120, 180, 300] as const;

export default async function EngagementTracker() {
  const h = await headers();
  const pathname = h.get("x-dk-pathname");
  if (!pathname) return null;

  // Bắt buộc có pixel attached → mới track engagement (nếu không có nơi để fire)
  const pixels = await getPixelsForPathname(pathname);
  if (pixels.length === 0) return null;

  // Slug để route CAPI event — lấy pixel đầu tiên active
  const cfg = await getLandingEventConfig(pathname);
  const slug = cfg?.slug || pixels[0]?.slug || "default";

  // Escape "<" to prevent </script> breakout from any user-controlled data.
  // JSON.stringify does NOT escape "</script>" — use Unicode escape so the
  // browser's HTML parser cannot see a closing tag inside the script block.
  const config = JSON.stringify({
    slug,
    scrollThresholds: SCROLL_THRESHOLDS,
    timeThresholds: TIME_THRESHOLDS,
  }).replace(/</g, "\\u003c");

  const script = `(function(){
if (window.__dkEngagementBound) return;
window.__dkEngagementBound = true;
var cfg = ${config};

function genId(prefix){
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
}

function fireEvent(eventName, customData) {
  var eventId = genId(eventName.toLowerCase());
  customData = customData || {};

  // 1) Client Pixel — phân biệt Standard vs Custom Event
  // Standard: fbq('track', ...). Custom: fbq('trackCustom', ...).
  // Pixel Helper extension chỉ detect đúng khi gọi đúng API.
  try {
    if (typeof window.fbq === 'function') {
      var STANDARD_EVENTS = ['AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration','Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout','Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication','Subscribe','ViewContent','PageView'];
      var method = STANDARD_EVENTS.indexOf(eventName) > -1 ? 'track' : 'trackCustom';
      window.fbq(method, eventName, customData, { eventID: eventId });
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
      fbclid: sp.get('fbclid') || undefined,
      gclid: sp.get('gclid') || undefined,
      referrer: document.referrer || undefined,
      landing_path: url.pathname
    };
    // EMQ Boost B — merge cached user_data từ sessionStorage
    var cachedUd = {};
    try { cachedUd = JSON.parse(sessionStorage.getItem('dk_user_data') || '{}'); } catch(e) {}
    var hasUd = cachedUd.email || cachedUd.phone || cachedUd.name;
    fetch('/api/capi/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        slug: cfg.slug,
        event_name: eventName,
        event_id: eventId,
        user_data: hasUd ? cachedUd : undefined,
        custom_data: customData,
        source_url: window.location.href,
        attribution: attribution
      })
    }).catch(function(){});
  } catch(e) {}
}

// ── ScrollDepth tracking ──
var scrollFired = {};
function getScrollPercent() {
  var doc = document.documentElement;
  var body = document.body;
  var scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  var viewportH = window.innerHeight || doc.clientHeight || 0;
  var fullH = Math.max(doc.scrollHeight, body.scrollHeight, doc.offsetHeight, body.offsetHeight);
  if (fullH <= viewportH) return 100; // page ngắn hơn viewport
  return Math.round(((scrollTop + viewportH) / fullH) * 100);
}

var scrollTicking = false;
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(function(){
    var pct = getScrollPercent();
    for (var i = 0; i < cfg.scrollThresholds.length; i++) {
      var t = cfg.scrollThresholds[i];
      if (pct >= t && !scrollFired[t]) {
        scrollFired[t] = true;
        fireEvent('ScrollDepth_' + t + '_percent', {
          scroll_depth: t,
          page_path: window.location.pathname
        });
      }
    }
    scrollTicking = false;
  });
}

// Trigger lần đầu để bắt page ngắn (đã hiện 100% mà chưa scroll)
function initScroll() {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScroll);
} else {
  initScroll();
}

// ── TimeOnPage tracking ──
// Track *visible* time — pause khi tab hidden, resume khi visible.
var timeFired = {};
var timeTimers = [];
var visibleMs = 0;            // tổng ms user thực sự xem trang
var lastVisibleAt = Date.now(); // mốc bắt đầu visible hiện tại (0 = đang hidden)

function setupTimeTimers() {
  // Clear any existing timers trước khi tạo mới
  timeTimers.forEach(function(t){ clearTimeout(t); });
  timeTimers = [];

  var elapsed = visibleMs; // visible time tích lũy tới hiện tại
  cfg.timeThresholds.forEach(function(sec) {
    if (timeFired[sec]) return;
    var remainMs = (sec * 1000) - elapsed;
    if (remainMs <= 0) return;
    var timer = setTimeout(function(){
      if (!timeFired[sec] && document.visibilityState !== 'hidden') {
        timeFired[sec] = true;
        fireEvent('TimeOnPage_' + sec + '_seconds', {
          time_on_page: sec,
          page_path: window.location.pathname
        });
      }
    }, remainMs);
    timeTimers.push(timer);
  });
}
setupTimeTimers();

// Pause / resume timers theo visibility — tránh fire khi user không xem
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    // Tích lũy khoảng visible vừa qua
    if (lastVisibleAt > 0) {
      visibleMs += Date.now() - lastVisibleAt;
      lastVisibleAt = 0;
    }
    timeTimers.forEach(function(t){ clearTimeout(t); });
    timeTimers = [];
  } else if (document.visibilityState === 'visible') {
    // Resume — restart timers với thời gian còn lại
    lastVisibleAt = Date.now();
    setupTimeTimers();
  }
});
})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
