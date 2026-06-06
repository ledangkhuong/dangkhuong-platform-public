# SEO Audit Report — dangkhuong.com

**Date:** 2026-06-06
**Scope:** Full read-only audit of the `dangkhuong-platform` Next.js 16 codebase, with focus on technical SEO, on-page tags, structured data, performance hooks and analytics coverage.
**Auditor:** Automated codebase review (grounded in real file paths under `src/`).

---

## Tech Stack Snapshot

- **Framework:** Next.js 16 App Router (`src/app/`) with route groups (`(dashboard)`, etc.). TypeScript strict mode.
- **Rendering mix:** Mostly Server Components; landing pages cached, course/checkout pages `force-dynamic` (`src/app/courses/[slug]/page.tsx:41`), shop PDP uses ISR (`revalidate = 600`, `src/app/(dashboard)/shop/[slug]/page.tsx:38`), blog post uses `revalidate = 3600` (`src/app/(dashboard)/blog/[slug]/page.tsx:20`).
- **Data layer:** Supabase Postgres (admin client used in `sitemap.ts` to bypass RLS).
- **Hosting:** Vercel.
- **Analytics already wired (do NOT remove):**
  - GA4 via `src/lib/gtag.ts`
  - Facebook Pixel + CAPI via `src/lib/fbpixel.ts` + `src/lib/facebook-capi.ts` + `src/components/analytics/AutoPixel.tsx`
  - Core Web Vitals via `src/components/analytics/WebVitals.tsx`
  - Engagement, enhanced, attribution & affiliate trackers all mounted in `src/app/layout.tsx`
- **SEO primitives present:**
  - `src/app/sitemap.ts` (static + dynamic courses, shop, blog)
  - `src/app/robots.ts`
  - `src/app/feed.xml/route.ts` (RSS 2.0 for blog)
  - JSON-LD components: `WebsiteJsonLd`, `CourseJsonLd`, `BreadcrumbJsonLd`, `ArticleJsonLd`, `FAQJsonLd` in `src/components/seo/`
  - 34 pages declare `export const metadata` or `generateMetadata`
- **Security headers** in `next.config.ts` (HSTS, CSP, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin) — strong baseline.
- **Image pipeline:** `next/image` enforced project-wide (`<img>` tag count = 0 in `src/`). AVIF/WebP enabled (`next.config.ts:96`).

---

## Current SEO State

| Check | Status | Evidence |
|---|---|---|
| `sitemap.xml` generated dynamically | OK | `src/app/sitemap.ts` |
| `robots.ts` with sitemap reference | OK | `src/app/robots.ts:33` |
| RSS feed for blog | OK | `src/app/feed.xml/route.ts` |
| Per-page `<title>` / description | Partial | 34/many files (most `(dashboard)` pages missing) |
| JSON-LD WebSite + Organization | Partial | `WebsiteJsonLd` only — Organization `@id` referenced but not defined |
| JSON-LD Article / Course / Breadcrumb / FAQ | OK | Files exist; used on course/shop/blog detail |
| Canonical URL per page | Partial | Only home + a handful of pages set `alternates.canonical` |
| Hreflang (multi-locale) | Missing | Single `lang="vi"` declared, no `alternates.languages` |
| OG / Twitter tags global + per-page | OK | Global in `layout.tsx`; 19 pages override |
| Image `alt` attributes | Partial | 31 files use `alt={...}` dynamic; some `alt=""` decorative; no automated lint rule |
| Internal linking structure | Weak | Few cross-links between blog ↔ courses ↔ shop |
| `next/image` usage | OK | No raw `<img>` tags |
| Core Web Vitals tracking | OK | `WebVitals.tsx` reports to GA4 |
| Page-speed posture (preload, font-display swap, inlineCss) | OK | `PreloadResources` + Inter `display:"swap"` + `experimental.inlineCss` |
| HTTPS / HSTS / security headers | OK | `next.config.ts:26-93` |
| 404 + global error pages | OK | `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx` |
| Skip-to-content for a11y | OK | `src/app/layout.tsx:90-95` |
| Cookie consent (GDPR-lite) | OK | `CookieConsent` mounted globally |
| `/blog` URL routing | Risk | Route lives under `(dashboard)/blog` group; OK technically but middleware could block bots |
| Sitemap mixes Course + Shop using same `status` filter | Risk | `sitemap.ts:13` and `:19` both query `products` — duplicate / wrong filter semantics |

---

## Top 20 Issues

| # | Category | Issue | File or URL | Severity | Effort | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Structured data | `WebsiteJsonLd` references `Organization` `@id` that is never emitted | `src/components/seo/WebsiteJsonLd.tsx:11` | H | S | Add an `OrganizationJsonLd` component (name, logo, sameAs, contactPoint) and mount in `layout.tsx` |
| 2 | Sitemap correctness | `sitemap.ts` runs two queries against `products` filtered on different `status` values (`published` and `active`) — likely returns 0 rows for one group | `src/app/sitemap.ts:10-20` | H | S | Confirm the product/course schema; split into `courses` + `shop_products` queries or use the canonical `type` column |
| 3 | Canonical URLs | Only `/` sets `alternates.canonical`; deep pages rely on Next defaults | `src/app/page.tsx:11`, no canonical in `(dashboard)/blog/[slug]/page.tsx` | H | S | Add `alternates.canonical` to every `generateMetadata` |
| 4 | Hreflang | `lang="vi"` only; no `alternates.languages` | `src/app/layout.tsx:86` | M | M | If targeting English audiences for VEO3.1 content, add `/en/` route + hreflang; otherwise add `x-default` |
| 5 | Robots policy | `disallow: ["/api/", "/admin", "/dashboard", ...]` — but `/dashboard` route group is `(dashboard)` which actually serves `/blog` and `/shop` publicly | `src/app/robots.ts:19-30` | H | S | Verify final URLs; `/shop` and `/blog` must NOT be disallowed — currently safe but fragile |
| 6 | OG image | Single hard-coded OG image `/images/hero/offer-banner.jpg` for entire site | `src/app/layout.tsx:54` | M | S | Add Next.js `opengraph-image.tsx` per route segment, or generate via `ImageResponse` |
| 7 | Twitter Card | Uses `summary_large_image` but no `twitter:site` / `twitter:creator` | `src/app/layout.tsx:61-66` | L | XS | Add `twitter.site` and `twitter.creator` handles |
| 8 | JSON-LD CourseInstance | `hasCourseInstance` is empty stub (no `startDate`, `instructor`, `location`) — Google may reject | `src/components/seo/CourseJsonLd.tsx:41-44` | M | S | Populate `instructor`, `courseWorkload`, `educationalLevel`, `inLanguage` |
| 9 | Blog metadata | Blog detail page is under `(dashboard)/blog/[slug]` — needs verification it is NOT gated by dashboard middleware/auth | `src/app/(dashboard)/blog/[slug]/page.tsx` + `src/middleware.ts` | H | S | Confirm public access; if auth-gated, move out of `(dashboard)` group |
| 10 | Image alt text | 5 files contain empty `alt=""` (decorative), 16 files use `<img alt=` in DM/email contexts — risk of stripped alts in rendered blog content | `src/components/cart/CartSheet.tsx`, `AutoPixel.tsx`, etc. | M | M | Audit alt-text policy: `alt=""` only for purely decorative; enforce via ESLint `jsx-a11y/alt-text` |
| 11 | Internal linking | No "related courses" / "related products" cross-link block between modules | `src/components/blog/RelatedPosts.tsx` exists but no cross-module recommender | M | M | Add server-rendered "Liên quan" widget per detail page; helps crawl depth & dwell |
| 12 | Sitemap freshness | Static pages all use `new Date()` as `lastModified` — sends fresh signal every crawl (anti-pattern) | `src/app/sitemap.ts:30-95` | M | XS | Use real last-modified date or content hash |
| 13 | Sitemap limit | Shop products `.limit(1000)` but no pagination — silent cap if catalogue grows | `src/app/sitemap.ts:20` | M | S | Add sitemap index + paginated child sitemaps once > 1000 URLs |
| 14 | Trailing slash policy | Not enforced; mixed across links risks duplicate URLs | `next.config.ts` (no `trailingSlash`) | L | XS | Decide one style and set `trailingSlash: false` explicitly |
| 15 | 404 SEO | `not-found.tsx` exists but no metadata override (default title) | `src/app/not-found.tsx` | L | XS | Add metadata `title: "Không tìm thấy trang | LĐK Academy"` |
| 16 | RSS feed | Hard-codes `EMAIL_FROM_NAME` for the channel title — confusing if env unset | `src/app/feed.xml/route.ts:30` | L | XS | Use `siteConfig.name` directly |
| 17 | Search action | WebSite JSON-LD declares `/search?q=` but no actual `/search` route exists | `src/components/seo/WebsiteJsonLd.tsx:16` | M | M | Either build `/search` page or remove `potentialAction` |
| 18 | Lazy images | `next/image priority` only used in 5 components — LCP image on home not verified | `src/app/HomePage.tsx` | M | S | Audit LCP element; add `priority` + `fetchPriority="high"` to hero |
| 19 | Heading hierarchy | No automated check — long pages may skip H2→H4 | `src/components/sales/SalesPageTemplate.tsx` and landing pages | L | M | Add `eslint-plugin-jsx-a11y/heading-has-content` + manual review |
| 20 | Multilingual brand consistency | Vietnamese diacritics in titles (`Lê Đăng Khương`) — verify rendered in Google SERP, not mangled to `Le Dang Khuong` | `src/app/page.tsx:8` | L | XS | Check GSC "Performance" → "Pages" sample after deploy |

---

## 30 / 60 / 90 Day Roadmap

### Days 0-30 — Foundation cleanup (quick wins)
- Fix issues #1, #2, #5, #9, #12, #15, #16 (high-leverage, S/XS effort).
- Add `OrganizationJsonLd` component and mount in `layout.tsx`.
- Add `alternates.canonical` to all `generateMetadata` functions (issue #3).
- Verify `/blog` and `/shop` accessibility for Googlebot (curl with `User-Agent: Googlebot`); fix robots if needed.
- Connect Google Search Console + Bing Webmaster Tools; submit `sitemap.xml`.
- Install Microsoft Clarity for heatmaps/session recording (free, no quota).
- Run baseline Lighthouse + PageSpeed Insights snapshots for `/`, `/courses`, `/shop`, `/blog`.

### Days 31-60 — Content + structured data
- Build out missing JSON-LD (issue #8 — Course details with instructor, FAQ on landing pages, Product schema completion on shop PDP).
- Add `opengraph-image.tsx` per route segment for branded OG cards (issue #6).
- Implement "Bài liên quan / Khóa học liên quan" cross-link blocks (issue #11) to improve internal PageRank flow.
- Build `/search` page or remove the SearchAction (issue #17).
- Audit and rewrite top-20 page titles for click-through rate using GSC impression data.
- Set up Google Tag Manager as the single tag delivery layer (consolidates GA4, FB Pixel, custom events).

### Days 61-90 — Performance + scale
- Hero LCP audit (issue #18); apply `priority` and `fetchPriority="high"`; preload hero font subset.
- Shift to sitemap index (issue #13) once >1000 shop products.
- Hreflang strategy (issue #4) — decide on English market or `x-default` only.
- Set up Screaming Frog free (500 URLs) monthly crawl for orphan-page detection.
- Add Sentry performance traces (already wired in `next.config.ts:122`) to find slow Server Component render paths.
- Establish weekly SEO KPI dashboard: GSC clicks, GA4 organic sessions, Core Web Vitals (LCP/INP/CLS), index coverage.

---

## Free Tools to Use

| Tool | Purpose | Why it matters here |
|---|---|---|
| **Google Search Console** | Index coverage, query data, Core Web Vitals field data | Single source of truth for what Google sees; required for sitemap submission |
| **Microsoft Clarity** | Heatmaps + session recording, no quota | Find dead clicks / rage clicks on landing pages without paying for Hotjar |
| **Google Tag Manager** | Tag governance | Consolidates GA4 + FB Pixel + future tags; lets non-engineers ship events |
| **Lighthouse** (Chrome DevTools) | Per-page perf + SEO + a11y audit | Run in CI via `@lhci/cli` (free) — catch regressions on PRs |
| **Screaming Frog SEO Spider (free)** | Site crawl up to 500 URLs | Catches broken links, missing titles, duplicate meta; works offline |
| **Ahrefs Webmaster Tools (free)** | Backlink monitoring + Site Audit | Free for verified site owners; complements GSC with off-page data |
| **PageSpeed Insights** | Lab + field Core Web Vitals | Cross-check Lighthouse with real CrUX data |
| **Sentry (free tier)** | Error + perf monitoring | Already configured in `next.config.ts:122` — leverage for slow route alerts |
| **Bing Webmaster Tools** | Bing/Yandex coverage | Trivial to add; surfaces issues GSC misses |
| **Rich Results Test** (Google) | Validate JSON-LD per page | Use after every JSON-LD change to confirm eligibility |

---

**Bottom line:** The codebase has a strong technical foundation — proper App Router structure, JSON-LD primitives, sitemap, RSS, security headers, and a comprehensive analytics stack already wired in. The biggest near-term wins are (a) fixing the duplicate-`products`-table query in `sitemap.ts`, (b) emitting Organization JSON-LD to satisfy the dangling `@id` reference, (c) adding per-page `canonical` URLs, and (d) confirming `/blog` is genuinely public. After those quick wins, focus shifts to structured-data depth, internal linking, and LCP optimization.
