# Kế hoạch tối ưu tốc độ — dangkhuong.com

> Tổng hợp từ audit 20 agent (read-only) ngày 2026-06-05. Mục tiêu Lighthouse mobile: Performance 70 → 90+, LCP 3.6s → <2.5s, TBT 560ms → <200ms.
> Stack: Next.js 16.2.6 (App Router), React 19.2, Tailwind v4, Supabase, Vercel.

## Nguyên nhân gốc (theo mức độ đồng thuận của các agent)

| # | Vấn đề | Xuất hiện ở | Ảnh hưởng chính |
|---|--------|-------------|-----------------|
| 1 | YouTube `<iframe>` trần, load ngay khi paint | 8/20 agent | LCP, TBT (1.7MB + 603ms) |
| 2 | `HomePage.tsx` là 1 client component 981 dòng | 5/20 | LCP (h1 không có trong HTML SSR), TBT |
| 3 | Query Supabase pixel lặp 3-5 lần/request, không cache | 6/20 | TTFB (0.9s) |
| 4 | `middleware` gọi `getUser()` cho cả khách ẩn danh | middleware | TTFB |
| 5 | Facebook Pixel 241KB load đồng bộ lúc parse | 5/20 | TBT |
| 6 | Supabase auth SDK import sẵn (modal đang ẩn) | 4/20 | Bundle JS |
| 7 | Inter font 7 weight rời (thay vì variable) | fonts | LCP, CSS chặn render |
| 8 | Ảnh quá khổ (portrait 1.2MB render 36px; banner PNG 1-1.8MB dùng `<img>` trần) | images | LCP, băng thông |
| 9 | CSS chặn render ~480ms, chưa bật `inlineCss` | css/build | FCP, LCP |
| 10 | Tracking trùng lặp + nhiều timer/MutationObserver | providers | TBT, main-thread |

---

## TIER 0 — Sửa ngay, rủi ro ~0, không đụng logic (1 buổi)

### 0.1 — Cấu hình `next.config.ts`
- **Bật `experimental.inlineCss: true`** → loại bỏ ~480ms CSS chặn render. Tailwind v4 nên CSS nhỏ.
- **Thêm `images.minimumCacheTTL: 2592000`** (30 ngày) → ảnh tĩnh hết re-validate mỗi 4h.
- **Thêm `experimental.optimizePackageImports: ['lucide-react', '@tiptap/starter-kit', '@tiptap/react', '@xyflow/react', '@dnd-kit/core', '@dnd-kit/sortable', '@tanstack/react-table', 'novel']`**.
- **Ảnh hưởng:** toàn site (global). `inlineCss` là experimental → phải test bản `next build` (không chạy ở dev). Trang dashboard nhiều CSS (Tiptap/XYFlow) có thể HTML to hơn chút. `minimumCacheTTL` cao → nếu ghi đè ảnh cùng tên sẽ thấy ảnh cũ tối đa 30 ngày (Vercel purge mỗi deploy nên thường OK).

### 0.2 — Font Inter: dùng variable weight
- `layout.tsx:27-30`: đổi `weight: ["300","400","500","600","700","800"]` → `weight: "100 900"` (và bỏ hẳn 300 nếu giữ list rời).
- **Gain:** giảm 14 preload font → 1-2, CSS font 10.9KB → ~2KB, LCP -200~600ms.
- **Ảnh hưởng:** chỉ `layout.tsx`. Render chữ giống hệt (Inter vốn là variable). Rủi ro ~0.

### 0.3 — Bỏ `tw-animate-css` khỏi global
- `globals.css:2`: chuyển import này sang CSS riêng của `(dashboard)`.
- **Gain:** -14.8KB CSS cho mọi trang public.
- **⚠️ Ảnh hưởng:** bất kỳ component public dùng class `animate-in/animate-out/fade-in/zoom-in/slide-in-*` sẽ mất hiệu ứng. Hiện chỉ `dropdown-menu.tsx` (dashboard) dùng — **phải grep toàn bộ component public trước khi gỡ**, đặc biệt modal/sheet/accordion shadcn dùng trên trang public. Class `animate-spin/pulse/bounce` là của Tailwind core, KHÔNG bị ảnh hưởng.

### 0.4 — YouTube facade (đổi `<iframe>` → click-to-play) ⭐ ưu tiên cao nhất
- `HomePage.tsx:286-293`: thay iframe trần bằng thumbnail (`i.ytimg.com/vi/b7tuRnyuuNw/maxresdefault.jpg`) + nút play, click mới chèn iframe thật. Mẫu đã có sẵn trong `HocLamToolVideoLanding.tsx:477-486`.
- **Gain:** bỏ ~1.7MB + 603ms main-thread khỏi tải đầu. LCP -0.8~1.5s, TBT -200~400ms. Hết cảnh báo "unused preconnect i.ytimg.com".
- **Ảnh hưởng:** chỉ hero `HomePage.tsx`. **Tracking video vẫn chạy**: `EnhancedTracker.tsx:171` đã có MutationObserver bắt iframe chèn động → sự kiện ViewContent vẫn bắn. Cần thêm `i.ytimg.com` vào `images.remotePatterns` (CSP `img-src` đã cho phép sẵn).

### 0.5 — Bỏ fetch lãng phí + dead code
- **`HomePage.tsx:117-139`**: section khoá học đang `display:none` (dòng 493) nhưng vẫn `fetch('/api/courses/public')` mỗi lần load → xoá useEffect + state, hoặc thêm `aria-hidden`.
- **Xoá `FacebookPixel.tsx`** (dead code, không import ở đâu — nguy cơ ai đó re-import gây double pixel). Kiểm tra `lib/fbpixel.ts` trước khi xoá.
- **Sửa/xoá Sentry stub** (`sentry.*.config.ts`): import `@/lib/monitoring/sentry` không tồn tại + `@sentry/nextjs` chưa cài → **nguy cơ crash server tiềm ẩn**. Xoá 3 file hoặc tạo stub `{enabled:false}`.
- **Ảnh hưởng:** đều là code chết / không hiển thị → rủi ro ~0.

### 0.6 — Accessibility (toàn bộ là thêm thuộc tính, rủi ro 0)
- **aria-label cho nút icon:** `HomePage.tsx:227` (hamburger, label đổi theo state), `:867` (đóng modal); `TopBar.tsx:163,175,108`; `Sidebar.tsx:286,293,602`; `SearchModal.tsx:296`.
- **Tương phản:** đổi `text-gray-500` → `text-gray-400` trong `HomePage.tsx` (~14 chỗ: 306, 578, 598, 700, 750, 779-819, 889, 897, 934).
- **Heading:** footer `h4` (788, 800, 810) → `h3`; section ẩn thêm `aria-hidden`.
- **Gain:** a11y 90 → 95+. **Ảnh hưởng:** thuần thị giác/ARIA, không đụng logic.

---

## TIER 1 — Hiệu quả cao, rủi ro thấp-trung (2-3 ngày)

### 1.1 — Cache query pixel config (React `cache()`) ⭐
- `lib/landing-pages.ts`: bọc `getPixelsForPathname` và `getLandingEventConfig` bằng `cache()` của React 19.
- **Gain:** từ 3-5 round-trip Supabase/request → 1. TTFB -100~300ms (kéo theo LCP).
- **Ảnh hưởng:** `AutoPixel/AutoEvent/EngagementTracker/EnhancedTracker` đều gọi 2 hàm này → đều hưởng lợi. `cache()` là request-scoped, **không có rủi ro stale**. (Nếu dùng `unstable_cache` để cache liên-request thì phải gọi `revalidateTag` ở trang admin pixel-settings.)

### 1.2 — Middleware: short-circuit `getUser()` cho khách ẩn danh ⭐
- `middleware.ts:206`: trước khi `createServerClient`, kiểm tra cookie `*-auth-token`. Không có cookie → `user = null`, bỏ qua round-trip tới Supabase Auth.
- **Gain:** TTFB -80~200ms cho phần lớn traffic (khách ẩn danh + bot Lighthouse). Đòn bẩy lớn nhất cho TTFB.
- **Ảnh hưởng:** bảo vệ route `/admin /dashboard /instructor` vẫn đúng (vẫn redirect). User đăng nhập vẫn refresh session. `x-dk-pathname` vẫn set bình thường nên AutoPixel không bị ảnh hưởng.

### 1.3 — Lazy-load Supabase auth & modal đăng ký
- `HomePage.tsx:14-15`: `SocialLoginButtons` + `PasswordInput` → `next/dynamic({ ssr:false })` (chỉ load khi mở modal). Lý tưởng hơn: tách cả modal (862-978) thành component lazy.
- **Gain:** bỏ ~150-200KB (Supabase auth-js) khỏi bundle đầu. TBT/TTI giảm.
- **Ảnh hưởng:** chỉ luồng modal đăng ký homepage; khi mở lần đầu có loading nhẹ (~50-150ms) → thêm spinner. `/login`, `/register` là route riêng, không ảnh hưởng. State form (`formData/formStatus`) cần move vào trong component lazy.

### 1.4 — Facebook Pixel: defer + preconnect
- `AutoPixel.tsx:62`: chuyển loader `fbevents.js` sang `next/script strategy="lazyOnload"` (giữ `fbq` stub queue để không mất event). Thêm `<link rel="preconnect" href="https://connect.facebook.net">`.
- **Gain:** TBT -150~250ms, LCP -100~200ms (241KB rời khỏi critical path).
- **⚠️ Ảnh hưởng:** kiến trúc `AutoPixel` đổi đáng kể. `AutoEvent/EngagementTracker` gọi `fbq()` → **stub phải emit trước chúng**. `PagePixelClient` polling có thể cần chỉnh. Event PageView bắn trễ hơn chút (chấp nhận được cho analytics). Cần verify ở Meta Events Manager / FB Pixel Helper.

### 1.5 — Resource hints
- Thêm component `PreloadResources` ('use client') dùng `ReactDOM.preconnect('https://www.youtube.com')`, `preconnect('https://connect.facebook.net')`, `prefetchDNS('https://i.ytimg.com')`, preconnect Supabase URL. Render 1 lần trong `layout.tsx`.
- **KHÔNG** tự thêm preconnect cho `fonts.googleapis/gstatic` — next/font đã tự lo.
- **Ảnh hưởng:** chỉ thêm kết nối sớm, render `null`, rủi ro ~0.

### 1.6 — Tối ưu ảnh (giảm vài MB)
- **Resize/nén nguồn:** `portrait.jpg` 1.2MB → ~900px q80 (~300KB); `channel-1..4.jpg` → 400px q82 (~80-120KB/ảnh); banner PNG landing (1-1.8MB) → JPEG/WebP q85 (~150-250KB).
- **Đổi `<img>` trần → `next/image`** ở 5 trang landing (GeminiPro, HocChuaXong, UpdateVeo, WebAllInOne, HocLamToolVideo) + navbar landing.
- **Next.js 16:** dùng `preload` (prop mới) thay cho `priority` (đã deprecated) cho ảnh LCP (`HomePage.tsx:407`, `sanphamso HeroSection:119`).
- **Gain:** 5-8MB/lần tải nguội mỗi landing page; LCP cải thiện mạnh trên mobile.
- **Ảnh hưởng:** đổi nguồn ảnh → cache `_next/image` ấm lại sau deploy. Nếu đổi đuôi file phải sửa `og:image` trong các `page.tsx`. `next/image fill` cần parent `position:relative`.

### 1.7 — Caching headers
- `vercel.json`: thêm `Cache-Control: public, max-age=31536000, immutable` cho `/images/(.*)`.
- `/api/courses/public`: `s-maxage=300` → `s-maxage=3600, stale-while-revalidate=86400`.
- **Ảnh hưởng:** ảnh thay tại chỗ sẽ stale tới khi đổi tên/đổi URL (Vercel purge mỗi deploy nên OK).

---

## TIER 2 — Tác động lớn nhưng cần refactor cẩn thận (1-2 tuần)

### 2.1 — Tách `HomePage.tsx` thành Server shell + Client islands ⭐⭐
- Hero (h1 dòng 262), pain-points, roadmap, about, audience, testimonials, footer → **Server Component** (HTML có sẵn trong SSR). Chỉ giữ `'use client'` cho: countdown, FAQ accordion, mobile menu, nút mở modal.
- **Gain:** bỏ 60-70% JS hydrate homepage; LCP -0.5~1s, TBT -200~350ms. **Đây là sửa cấu trúc quan trọng nhất** (h1 LCP sẽ nằm trong HTML đầu tiên).
- **⚠️ Ảnh hưởng (rủi ro cao nhất):** state đang gom 1 chỗ (`countdown/openFaq/mobileMenu/showLeadModal/formData...`) phải tách hoặc dùng context. Mỗi nút mở modal rải ở 6 section phải thành client leaf nhỏ. Tách sai → hydration mismatch. Cần test kỹ. Chỉ ảnh hưởng `HomePage.tsx` + 2 sub-component, không trang khác import.

### 2.2 — Cô lập countdown timer
- Tách `setInterval` 1s (142-154) thành `<CountdownTimer>` riêng → re-render mỗi giây chỉ trong nó, không quét cả cây 1157 node.
- **Gain:** TBT -150~450ms tích luỹ. **Ảnh hưởng:** chỉ thị giác countdown, rủi ro ~0. (Có thể làm sớm ở Tier 1 nếu chưa tách cả trang.)

### 2.3 — Gộp & giảm tracking trùng lặp
- Bỏ scroll/time tracking trùng giữa `TrackingProvider` và `EngagementTracker` (đang gửi 2 backend khác nhau — cần xác nhận với marketing backend nào là chuẩn).
- Tách Suspense gộp 6 tracker trong `layout.tsx:93` → mỗi component 1 Suspense (1 query chậm không chặn cả cụm).
- Thu hẹp MutationObserver `EnhancedTracker/EventAttrTracker` chỉ lọc `video`/`iframe[youtube]`.
- Gộp 7 `setTimeout` của EngagementTracker thành 1 chuỗi; bỏ bớt polling 3 timer của `PagePixelClient`.
- **Gain:** TBT -50~150ms, ít main-thread callback. **⚠️ Ảnh hưởng:** đụng tracking quảng cáo → dễ mất event nếu sai. Verify kỹ ở Meta Events Manager. Xác nhận với marketing trước khi bỏ backend nào.

### 2.4 — Landing pages dùng chung
- Tách modal thanh toán bị copy 6 lần thành `<LandingPaymentModal>` (nhận `accentColor` prop) + lazy-load.
- Bỏ `'use client'` ở các section tĩnh; bọc animation CSS vô tận trong `prefers-reduced-motion`.
- **Gain:** -200~350KB JS/trang landing. **Ảnh hưởng:** mỗi landing có màu/text riêng ở modal → cần prop hoá. Section nào ngầm dùng hook sẽ lỗi build nếu gỡ `'use client'` (bắt được lúc build — an toàn).

---

## TIER 3 — Tùy chọn / dài hạn

- **`reactCompiler: true`** (cài `babel-plugin-react-compiler`) → auto-memo, giảm re-render. Nên bật chế độ `annotation` trước.
- **`cacheComponents: true` + PPR** cho shell homepage → bỏ TTFB server-render. **Rủi ro cao**: đổi cách cache toàn app, phải audit mọi page/route, AutoPixel/AutoEvent (đọc header request-time) phải bọc Suspense.
- **Migrate `middleware.ts` → `proxy.ts`** (Next 16): `npx @next/codemod@canary middleware-to-proxy .`.
- **Hoàn thiện GA4** (hiện tại GA4 *hoàn toàn không chạy* — `NEXT_PUBLIC_GA_MEASUREMENT_ID` chưa set, script gtag chưa từng được chèn): không phải vấn đề tốc độ nhưng đang mất 100% dữ liệu analytics.
- **Compliance (không phải tốc độ nhưng quan trọng):** `AutoPixel.tsx:48-58` tự ghi consent = accepted trước khi user bấm → vi phạm GDPR/PDPA cho pixel `apply_to_all_pages`. Nên chỉ auto-accept cho trang sales trong `HIDE_ON_PATHS`.

---

## Bản đồ ảnh hưởng (đụng vào đâu thì rủi ro lan tới đâu)

| Khu vực sửa | Lan tới | Mức rủi ro |
|---|---|---|
| YouTube facade | `EnhancedTracker` (MutationObserver đã handle) | Thấp |
| Facebook Pixel defer | AutoEvent/EngagementTracker (cần `fbq` stub trước), PagePixelClient, Meta Events Manager | **Trung-cao** |
| Cache pixel query | 4 tracker dùng chung; admin pixel-settings (nếu dùng unstable_cache) | Thấp |
| Middleware short-circuit | route bảo vệ `/admin /dashboard /instructor` | Thấp |
| Tách HomePage | state chia sẻ, nút mở modal ở 6 section | **Cao** |
| Bỏ tw-animate-css | mọi component public dùng `animate-in/fade-in/...` | Trung |
| Đổi nguồn ảnh | `og:image` metadata, cache `_next/image` | Thấp-trung |
| Gộp tracking | analytics_events vs Facebook CAPI (2 backend) | **Trung-cao** |

## Thứ tự đề xuất (ROI cao → thấp)
1. **Tier 0** toàn bộ (đặc biệt 0.4 YouTube facade) — 1 buổi, gần như không rủi ro, đã đủ kéo Performance ~70 → ~82-85.
2. **Tier 1.1 + 1.2** (cache query + middleware) — TTFB.
3. **Tier 1.3 + 1.4 + 1.6** (lazy auth, defer pixel, ảnh).
4. **Tier 2.1** (tách HomePage) khi có thời gian test kỹ — đẩy nốt LCP về <2.5s.
