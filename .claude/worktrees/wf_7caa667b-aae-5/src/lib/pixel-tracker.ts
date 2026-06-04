/**
 * Client-side helpers để fire event (Lead, Contact, ViewContent, ...) song song
 * trên cả Pixel (fbq) + CAPI (POST /api/capi/track) — dedupe qua event_id.
 *
 * KHÔNG dùng cho PageView (đã được PagePixelClient lo).
 *
 * Ví dụ:
 *   import { trackPageEvent } from "@/lib/pixel-tracker";
 *
 *   onSubmit(e) {
 *     ...form logic...
 *     trackPageEvent({
 *       slug: "khoa-hoc-video-ai",
 *       eventName: "Lead",
 *       userData: { email: form.email, phone: form.phone, name: form.name },
 *       customData: { content_name: "Đăng ký tư vấn" },
 *     });
 *   }
 */

interface TrackPageEventOpts {
  /** Slug của pixel_config tương ứng (khớp với <PagePixel slug=...>). */
  slug: string;
  /** Event name chuẩn của Meta: Lead, Contact, Purchase, ViewContent, AddToCart, InitiateCheckout... */
  eventName: string;
  /** Thông tin user để CAPI hash (email/phone/name/userId). */
  userData?: {
    email?: string;
    phone?: string;
    name?: string;
    userId?: string;
  };
  /** Custom data (value, currency, content_name, ...) gửi cho cả Pixel + CAPI. */
  customData?: Record<string, unknown>;
  /** Event ID custom; nếu bỏ trống sẽ auto-generate UUID. */
  eventId?: string;
}

/** Generate UUID (browser only). */
function genEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Fire 1 event lên Pixel + CAPI cùng lúc, dedupe qua eventID.
 * Không throw — analytics fail không được block UX.
 */
export function trackPageEvent(opts: TrackPageEventOpts): string {
  const eventId = opts.eventId || genEventId(opts.eventName.toLowerCase());

  // 1. Client-side Pixel
  try {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") {
      fbq("track", opts.eventName, opts.customData || {}, { eventID: eventId });
    }
  } catch (err) {
    if (typeof console !== "undefined") console.warn("[pixel-tracker] fbq error:", err);
  }

  // 2. Server-side CAPI
  try {
    void fetch("/api/capi/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        slug: opts.slug,
        event_name: opts.eventName,
        event_id: eventId,
        user_data: opts.userData || {},
        custom_data: opts.customData || {},
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => {
      /* swallow */
    });
  } catch (err) {
    if (typeof console !== "undefined") console.warn("[pixel-tracker] CAPI error:", err);
  }

  return eventId;
}

/** Shortcut cho event Lead (form đăng ký). */
export function trackLead(
  slug: string,
  userData: TrackPageEventOpts["userData"],
  customData?: Record<string, unknown>,
) {
  return trackPageEvent({ slug, eventName: "Lead", userData, customData });
}

/** Shortcut cho event Contact (click gọi/chat). */
export function trackContact(
  slug: string,
  userData?: TrackPageEventOpts["userData"],
  customData?: Record<string, unknown>,
) {
  return trackPageEvent({ slug, eventName: "Contact", userData, customData });
}

/** Shortcut cho event ViewContent (xem chi tiết sản phẩm). */
export function trackViewContent(
  slug: string,
  customData?: Record<string, unknown>,
) {
  return trackPageEvent({ slug, eventName: "ViewContent", customData });
}
