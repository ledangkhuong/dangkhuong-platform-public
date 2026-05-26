"use client";

import { useEffect } from "react";
import { trackPageEvent } from "@/lib/pixel-tracker";

/**
 * <EventAttrTracker /> — Tự động fire Pixel + CAPI event cho element có
 * `data-dk-track` attribute. Marketing chỉ cần paste data-attribute vào HTML
 * của landing, KHÔNG cần viết JS.
 *
 * Ví dụ trong landing:
 *
 *   <button data-dk-track="Contact" data-dk-content="Gọi điện">Gọi ngay</button>
 *
 *   <form data-dk-track="Lead" data-dk-on="submit" data-dk-value="0">
 *     <input name="email" />
 *     ...
 *   </form>
 *
 *   <a href="https://zalo.me/..." data-dk-track="Contact" data-dk-content="Chat Zalo">
 *     Nhắn Zalo
 *   </a>
 *
 *   <div data-dk-track="ViewContent" data-dk-on="visible">  ← fire khi user scroll tới
 *     Bảng giá
 *   </div>
 *
 * Data attributes hỗ trợ:
 *   - data-dk-track="EventName"     (bắt buộc) — Lead | Contact | Purchase | ViewContent | AddToCart | Subscribe | hoặc custom
 *   - data-dk-on="click|submit|visible" (optional) — mặc định click; visible dùng IntersectionObserver
 *   - data-dk-slug="khoa-hoc-x"     (optional) — slug pixel_config, nếu không có sẽ lấy từ <PagePixel> đầu tiên trong DOM
 *   - data-dk-content="..."         (optional) — gắn vào custom_data.content_name
 *   - data-dk-value="999000"        (optional) — gắn vào custom_data.value (VND)
 *   - data-dk-currency="VND"        (optional) — mặc định VND
 *   - data-dk-once="1"              (optional) — chỉ fire 1 lần/page-load (mặc định)
 *   - data-dk-once="0"              — fire mỗi lần click
 */
export default function EventAttrTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fired = new WeakSet<Element>();

    function getSlugFromContext(el: Element): string {
      const explicit = el.getAttribute("data-dk-slug");
      if (explicit) return explicit;
      // Tìm slug từ data-dk-default-slug (set ở body/html bởi server hoặc PagePixel)
      const ctx = document.querySelector("[data-dk-default-slug]") as HTMLElement | null;
      return ctx?.dataset.dkDefaultSlug || "default";
    }

    function fire(el: Element) {
      const onceAttr = el.getAttribute("data-dk-once");
      const once = onceAttr === null || onceAttr === "" || onceAttr === "1" || onceAttr === "true";
      if (once && fired.has(el)) return;
      fired.add(el);

      const eventName = el.getAttribute("data-dk-track") || "";
      if (!eventName) return;

      const slug = getSlugFromContext(el);
      const content = el.getAttribute("data-dk-content") || undefined;
      const valueStr = el.getAttribute("data-dk-value");
      const value = valueStr ? Number(valueStr) : undefined;
      const currency = el.getAttribute("data-dk-currency") || (value ? "VND" : undefined);

      // Lấy user data từ form gần nhất (nếu có)
      let userData: { email?: string; phone?: string; name?: string } | undefined;
      const form = el.closest("form");
      if (form) {
        const fd = new FormData(form);
        const email = fd.get("email")?.toString().trim();
        const phone = fd.get("phone")?.toString().trim();
        const name = (fd.get("name") || fd.get("full_name") || fd.get("fullname"))?.toString().trim();
        if (email || phone || name) userData = { email, phone, name };
      }

      const customData: Record<string, unknown> = {};
      if (content) customData.content_name = content;
      if (!Number.isNaN(value as number) && value !== undefined) {
        customData.value = value;
        customData.currency = currency || "VND";
      }

      try {
        trackPageEvent({
          slug,
          eventName,
          userData,
          customData: Object.keys(customData).length ? customData : undefined,
        });
      } catch {
        /* never throw from analytics */
      }
    }

    // ── Click handler (delegated) ──────────────────────────────
    const onClick = (e: Event) => {
      let target = e.target as Element | null;
      // Walk up DOM tìm element gần nhất có data-dk-track
      while (target && target !== document.body) {
        if (target.hasAttribute && target.hasAttribute("data-dk-track")) {
          const on = target.getAttribute("data-dk-on") || "click";
          if (on === "click") fire(target);
          break;
        }
        target = target.parentElement;
      }
    };

    // ── Submit handler (forms) ─────────────────────────────────
    const onSubmit = (e: Event) => {
      const form = e.target as Element | null;
      if (!form) return;
      if (form.hasAttribute("data-dk-track")) {
        const on = form.getAttribute("data-dk-on");
        // Submit khi data-dk-on="submit" HOẶC form không chỉ định
        if (on === "submit" || !on) fire(form);
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    // ── IntersectionObserver cho data-dk-on="visible" ──────────
    const visibleEls = Array.from(document.querySelectorAll('[data-dk-track][data-dk-on="visible"]'));
    let io: IntersectionObserver | null = null;
    if (visibleEls.length > 0 && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              fire(entry.target);
              io?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.4 },
      );
      visibleEls.forEach((el) => io!.observe(el));
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      io?.disconnect();
    };
  }, []);

  return null;
}
