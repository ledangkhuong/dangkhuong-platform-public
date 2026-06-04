/**
 * <EventAttrTracker /> — Server component emit inline script tự lắng nghe
 * click / submit / IntersectionObserver cho mọi element có data-dk-track.
 *
 * Inline (không phụ thuộc React hydration) để tránh vấn đề Suspense streaming
 * trong layout root khiến useEffect không fire.
 *
 * Data attributes hỗ trợ:
 *   data-dk-track="EventName"     (bắt buộc)
 *   data-dk-on="click|submit|visible"  (mặc định click)
 *   data-dk-slug="..."            (nếu không có → data-dk-default-slug ancestor)
 *   data-dk-content="..."         → custom_data.content_name
 *   data-dk-value="999000"        → custom_data.value
 *   data-dk-currency="VND"        → custom_data.currency
 *   data-dk-once="0"              → fire mỗi lần (mặc định: once-per-page)
 *
 * Auto-read user data từ <form> cha gần nhất: name="email" / "phone" /
 * "name" / "full_name" / "fullname".
 */

const TRACKER_SCRIPT = `(function(){
if (window.__dkEventTrackerInstalled) return;
window.__dkEventTrackerInstalled = true;

var fired = new WeakSet();

function getSlug(el) {
  var explicit = el.getAttribute && el.getAttribute('data-dk-slug');
  if (explicit) return explicit;
  var ctx = document.querySelector('[data-dk-default-slug]');
  return (ctx && ctx.getAttribute('data-dk-default-slug')) || 'default';
}

function getUserData(el) {
  var form = el.closest && el.closest('form');
  if (!form) return null;
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

function genId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
}

function fire(el) {
  var onceAttr = el.getAttribute('data-dk-once');
  var once = onceAttr === null || onceAttr === '' || onceAttr === '1' || onceAttr === 'true';
  if (once && fired.has(el)) return;
  fired.add(el);

  var eventName = el.getAttribute('data-dk-track');
  if (!eventName) return;

  var slug = getSlug(el);
  var content = el.getAttribute('data-dk-content');
  var valueStr = el.getAttribute('data-dk-value');
  var value = valueStr ? Number(valueStr) : undefined;
  var currency = el.getAttribute('data-dk-currency') || (value ? 'VND' : undefined);

  var customData = {};
  if (content) customData.content_name = content;
  if (value !== undefined && !isNaN(value)) {
    customData.value = value;
    customData.currency = currency || 'VND';
  }
  var hasCustom = Object.keys(customData).length > 0;

  var userData = getUserData(el);
  var eventId = genId(eventName.toLowerCase());

  // 1) Client Pixel — phân biệt Standard vs Custom Event
  try {
    if (typeof window.fbq === 'function') {
      var STANDARD_EVENTS = ['AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration','Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout','Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication','Subscribe','ViewContent','PageView'];
      var method = STANDARD_EVENTS.indexOf(eventName) > -1 ? 'track' : 'trackCustom';
      window.fbq(method, eventName, hasCustom ? customData : {}, { eventID: eventId });
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
    // EMQ Boost B — merge cached user_data
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
        slug: slug,
        event_name: eventName,
        event_id: eventId,
        user_data: hasUd ? mergedUd : undefined,
        custom_data: hasCustom ? customData : undefined,
        source_url: window.location.href,
        attribution: attribution
      })
    }).catch(function(){});
  } catch(e) {}
}

// Click delegation (bubbling capture phase) — tìm ancestor có data-dk-track
document.addEventListener('click', function(e) {
  var t = e.target;
  while (t && t !== document.body) {
    if (t.hasAttribute && t.hasAttribute('data-dk-track')) {
      var on = t.getAttribute('data-dk-on') || 'click';
      if (on === 'click') fire(t);
      break;
    }
    t = t.parentElement;
  }
}, true);

// Submit delegation cho form
document.addEventListener('submit', function(e) {
  var f = e.target;
  if (f && f.hasAttribute && f.hasAttribute('data-dk-track')) {
    var on = f.getAttribute('data-dk-on');
    if (on === 'submit' || !on) fire(f);
  }
}, true);

// IntersectionObserver cho data-dk-on="visible"
function setupVisibilityObserver() {
  if (!('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('[data-dk-track][data-dk-on="visible"]');
  if (!els.length) return;
  var io = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        fire(entries[i].target);
        io.unobserve(entries[i].target);
      }
    }
  }, { threshold: 0.4 });
  els.forEach(function(el){ io.observe(el); });
  // MutationObserver để bắt cả các element thêm vào sau (SPA navigation)
  if (window.MutationObserver) {
    new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes && m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            if (n.matches && n.matches('[data-dk-track][data-dk-on="visible"]')) io.observe(n);
            if (n.querySelectorAll) {
              n.querySelectorAll('[data-dk-track][data-dk-on="visible"]').forEach(function(c){ io.observe(c); });
            }
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupVisibilityObserver);
} else {
  setupVisibilityObserver();
}
})();`;

export default function EventAttrTracker() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: TRACKER_SCRIPT }}
      suppressHydrationWarning
    />
  );
}
