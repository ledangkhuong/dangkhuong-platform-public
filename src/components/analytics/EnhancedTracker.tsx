import { headers } from "next/headers";
import { getPixelsForPathname } from "@/lib/landing-pages";

/**
 * <EnhancedTracker /> — Server component emit inline script tự động track
 * 3 loại engagement event nâng cao:
 *
 *   1. VideoPlay → fire ViewContent (Standard) với content_type=video
 *      khi user click play <video> hoặc YouTube iframe
 *
 *   2. FormStart → fire Custom Event "FormStart" khi user focus lần đầu
 *      vào input email/phone/name trong form (intent signal)
 *      KHÔNG fire Lead ở đây — Lead chỉ fire khi submit thật (AutoEvent lo)
 *
 *   3. OutboundLink → fire Contact (Standard) khi user click link
 *      tel: / mailto: / zalo / messenger / external domain
 *
 * Auto-fire trên mọi landing có Pixel attached. Mỗi event 1 lần/page-load.
 */
export default async function EnhancedTracker() {
  const h = await headers();
  const pathname = h.get("x-dk-pathname");
  if (!pathname) return null;

  const pixels = await getPixelsForPathname(pathname);
  if (pixels.length === 0) return null;

  const safeSlug = pixels[0]?.slug && /^[a-z0-9-]+$/.test(pixels[0].slug)
    ? pixels[0].slug
    : "default";

  const script = `(function(){
if (window.__dkEnhancedBound) return;
window.__dkEnhancedBound = true;
var slug = '${safeSlug}';

var STANDARD_EVENTS = ['AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration','Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout','Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication','Subscribe','ViewContent','PageView'];

function genId(prefix){
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
}

// EMQ Boost B helper — đọc user_data đã cache trong sessionStorage,
// merge với userData passed-in để CAPI hash + gửi Meta
function getCachedUserData() {
  try {
    return JSON.parse(sessionStorage.getItem('dk_user_data') || '{}');
  } catch(e) { return {}; }
}

function fire(eventName, customData, userData) {
  var eventId = genId(eventName.toLowerCase());
  customData = customData || {};

  // Merge cached user_data → mọi event tự kèm email/phone (nếu user đã nhập)
  var mergedUserData = userData || {};
  var cached = getCachedUserData();
  if (cached.email && !mergedUserData.email) mergedUserData.email = cached.email;
  if (cached.phone && !mergedUserData.phone) mergedUserData.phone = cached.phone;
  if (cached.name && !mergedUserData.name) mergedUserData.name = cached.name;
  var hasUserData = mergedUserData.email || mergedUserData.phone || mergedUserData.name;

  // 1) Client Pixel — Standard hoặc Custom
  try {
    if (typeof window.fbq === 'function') {
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
    fetch('/api/capi/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        slug: slug,
        event_name: eventName,
        event_id: eventId,
        user_data: hasUserData ? mergedUserData : undefined,
        custom_data: customData,
        source_url: window.location.href,
        attribution: attribution
      })
    }).catch(function(){});
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════════
// #2 VideoPlay tracking — <video> + YouTube iframe
// ══════════════════════════════════════════════════════════════
var videosFired = new WeakSet();

function trackNativeVideos() {
  var videos = document.querySelectorAll('video');
  videos.forEach(function(v) {
    if (videosFired.has(v)) return;
    v.addEventListener('play', function() {
      if (videosFired.has(v)) return;
      videosFired.add(v);
      fire('ViewContent', {
        content_type: 'video',
        content_name: v.title || v.getAttribute('data-title') || 'Native video',
        content_ids: [v.src || v.currentSrc || 'unknown']
      });
    }, { once: false });
  });
}

function trackYouTubeIframes() {
  // YouTube iframe API: postMessage events khi user play
  var iframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
  iframes.forEach(function(iframe) {
    if (videosFired.has(iframe)) return;
    // Bật enablejsapi để Y!Tube gửi postMessage
    try {
      var src = iframe.src;
      if (src.indexOf('enablejsapi=1') === -1) {
        iframe.src = src + (src.indexOf('?') > -1 ? '&' : '?') + 'enablejsapi=1';
      }
    } catch(e) {}
  });

  // Listen postMessage từ YouTube
  if (!window.__dkYTListener) {
    window.__dkYTListener = true;
    window.addEventListener('message', function(e) {
      try {
        if (typeof e.data !== 'string') return;
        if (e.data.indexOf('youtube') === -1 && e.data.indexOf('"event":"video-progress"') === -1) return;
        var data = JSON.parse(e.data);
        // YouTube state 1 = playing
        if (data.event === 'onStateChange' && data.info === 1) {
          var iframe = Array.from(document.querySelectorAll('iframe[src*="youtube"]'))
            .find(function(f){ return f.contentWindow === e.source; });
          if (iframe && !videosFired.has(iframe)) {
            videosFired.add(iframe);
            // Lấy video ID từ URL
            var match = iframe.src.match(/(?:youtube\\.com\\/embed\\/|youtu\\.be\\/)([\\w-]+)/);
            var videoId = match ? match[1] : 'unknown';
            fire('ViewContent', {
              content_type: 'video',
              content_name: iframe.title || 'YouTube video',
              content_ids: [videoId]
            });
          }
        }
      } catch(err) {}
    });
  }
}

function setupVideoTracking() {
  trackNativeVideos();
  trackYouTubeIframes();

  // MutationObserver — bắt video thêm vào DOM sau (SPA / lazy load)
  if (window.MutationObserver) {
    new MutationObserver(function(mutations) {
      var hasNewMedia = false;
      mutations.forEach(function(m) {
        m.addedNodes && m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1 && (n.querySelector('video') || n.querySelector('iframe[src*="youtube"]') || n.tagName === 'VIDEO' || (n.tagName === 'IFRAME' && /youtube|youtu\\.be/.test(n.src || '')))) {
            hasNewMedia = true;
          }
        });
      });
      if (hasNewMedia) {
        trackNativeVideos();
        trackYouTubeIframes();
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
}

// ══════════════════════════════════════════════════════════════
// #3 FormStart tracking — focus input lần đầu (intent signal)
//    + EMQ Boost B: cache email/phone/name vào sessionStorage để các
//    event sau đó (Pixel + CAPI) tự kèm user_data → Match Quality tăng
// ══════════════════════════════════════════════════════════════
var formsFiredStart = new WeakSet();

function isLeadField(target) {
  if (!target || target.nodeType !== 1) return null;
  var tag = target.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return null;
  var name = (target.name || '').toLowerCase();
  var type = (target.type || '').toLowerCase();
  if (name === 'email' || type === 'email') return 'email';
  if (name === 'phone' || type === 'tel') return 'phone';
  if (name === 'name' || name === 'full_name' || name === 'fullname') return 'name';
  return null;
}

// FormStart event — fire 1 lần khi user focus
document.addEventListener('focusin', function(e) {
  var field = isLeadField(e.target);
  if (!field) return;
  var form = e.target.closest('form');
  if (!form || formsFiredStart.has(form)) return;
  formsFiredStart.add(form);
  fire('FormStart', {
    content_name: 'Form started',
    page_path: window.location.pathname,
    first_field: field
  });
}, true);

// EMQ Boost B — listen 'input' event lưu giá trị vào sessionStorage
// → mọi event Pixel/CAPI sau đó tự kèm hashed user_data → EMQ ++
document.addEventListener('input', function(e) {
  var field = isLeadField(e.target);
  if (!field) return;
  var val = e.target.value ? String(e.target.value).trim() : '';
  if (!val || val.length < 2) return;
  try {
    var cached = JSON.parse(sessionStorage.getItem('dk_user_data') || '{}');
    // Validate sơ bộ trước khi cache
    if (field === 'email' && val.indexOf('@') === -1) return;
    if (field === 'phone') val = val.replace(/[^0-9+]/g, '');
    cached[field] = val;
    sessionStorage.setItem('dk_user_data', JSON.stringify(cached));
  } catch(err) {}
}, true);

// ══════════════════════════════════════════════════════════════
// #4 OutboundLink tracking — click link external / contact intent
// ══════════════════════════════════════════════════════════════
var linksClicked = new WeakSet();

function getCurrentHost() {
  try { return window.location.hostname; } catch(e) { return ''; }
}

function classifyLink(href) {
  if (!href) return null;
  var h = String(href).toLowerCase();
  if (h.indexOf('tel:') === 0) return { method: 'phone', label: 'Gọi điện' };
  if (h.indexOf('mailto:') === 0) return { method: 'email', label: 'Gửi email' };
  if (h.indexOf('zalo.me') > -1 || h.indexOf('zalo://') > -1) return { method: 'zalo', label: 'Chat Zalo' };
  if (h.indexOf('m.me') > -1 || h.indexOf('messenger.com') > -1) return { method: 'messenger', label: 'Chat Messenger' };
  if (h.indexOf('wa.me') > -1 || h.indexOf('whatsapp') > -1) return { method: 'whatsapp', label: 'WhatsApp' };
  if (h.indexOf('t.me') > -1 || h.indexOf('telegram') > -1) return { method: 'telegram', label: 'Telegram' };
  // External link khác
  if (h.indexOf('http') === 0) {
    try {
      var u = new URL(href);
      if (u.hostname && u.hostname !== getCurrentHost()) {
        return { method: 'external', label: 'External link', host: u.hostname };
      }
    } catch(e) {}
  }
  return null;
}

document.addEventListener('click', function(e) {
  var el = e.target;
  // Walk up tìm <a>
  while (el && el !== document.body && el.tagName !== 'A') {
    el = el.parentElement;
  }
  if (!el || el.tagName !== 'A' || linksClicked.has(el)) return;

  var href = el.getAttribute('href') || el.href;
  var classified = classifyLink(href);
  if (!classified) return;

  linksClicked.add(el);

  // Contact intent → fire Standard Event "Contact"
  if (classified.method === 'phone' || classified.method === 'email' ||
      classified.method === 'zalo' || classified.method === 'messenger' ||
      classified.method === 'whatsapp' || classified.method === 'telegram') {
    fire('Contact', {
      content_name: classified.label,
      contact_method: classified.method
    });
  } else if (classified.method === 'external') {
    // External link click — fire Custom Event "OutboundClick"
    fire('OutboundClick', {
      content_name: 'External: ' + classified.host,
      outbound_host: classified.host
    });
  }
}, true);

// ── Init ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupVideoTracking);
} else {
  setupVideoTracking();
}
})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
