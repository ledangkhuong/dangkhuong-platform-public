# SEO Metadata Audit — Task A9

Audit of `generateMetadata` and static `metadata` exports across `src/app/**/page.tsx`.

Targets per page:
- `title` < 60 chars
- `description` < 160 chars
- `openGraph` with `title`, `description`, `images`, `locale: "vi_VN"`, `type: "website"`
- `twitter` with `card: "summary_large_image"`, `title`, `description`, `images`
- `alternates.canonical` set to the full URL

Priority key: **P0** = public, high-traffic landing/marketing pages that drive SEO and social shares. **P1** = public secondary pages (legal, auth landing). **P2** = private/utility pages where SEO is not relevant (noindex is fine, OG optional). **P3** = admin-only pages (noindex, metadata not needed).

## Fixed in this task (top 5)

| Page | Title len | Desc len | Has OG | Has canonical | Has Twitter |
|---|---|---|---|---|---|
| `src/app/page.tsx` (`/`) | 43 | 129 | yes (full) | yes | yes |
| `src/app/courses/page.tsx` (`/courses`) | 33 | 81 | yes (full) | yes | yes |
| `src/app/(dashboard)/shop/page.tsx` (`/shop`) | 51 | 114 | yes (full) | yes | yes |
| `src/app/(dashboard)/blog/page.tsx` (`/blog`) | 29 | 100 | yes (full) | yes | yes |
| `src/app/weballinone/page.tsx` (`/weballinone`) | 46 | 141 | yes (full) | yes | yes |

## Remaining pages — to fix

Title / desc lengths reflect the current literal string in source. For pages where metadata is generated from DB rows (products, blog posts), lengths are listed as `dynamic`.

### Public landing / marketing pages (P0–P1)

| Page | Title len | Desc len | Has OG | Has canonical | Priority fix |
|---|---|---|---|---|---|
| `src/app/sales/[slug]/page.tsx` | dynamic | dynamic | yes (partial — missing `locale`, `type`, `url`, `images` may be undefined) | NO | P0 — add canonical `${BASE_URL}/sales/${slug}`, ensure `locale: "vi_VN"`, `type: "website"`, full Twitter card |
| `src/app/courses/[slug]/page.tsx` | dynamic | dynamic | yes (partial — missing `locale`, `type`, `url`, `siteName`) | yes | P0 — extend OG with `locale`, `type`, `url`, add Twitter card |
| `src/app/(dashboard)/shop/[slug]/page.tsx` | dynamic | dynamic | yes (review for `locale`/`type`) | yes | P0 — verify `locale: "vi_VN"`, `type: "website"`/`"product"`, add Twitter card |
| `src/app/(dashboard)/blog/[slug]/page.tsx` | dynamic | dynamic (truncated to 160) | yes (likely partial) | yes (built from `BASE_URL`) | P0 — verify OG `locale`/`type`/`images`, add Twitter card |
| `src/app/tang4thanggeminipro/page.tsx` | 83 (**over 60**) | 184 (**over 160**) | yes (missing `locale`, `siteName`) | yes | P0 — shorten title/desc, add `locale: "vi_VN"`, `siteName`, Twitter card |
| `src/app/updateveo3.1/page.tsx` | 74 (**over 60**) | 207 (**over 160**) | yes (missing `locale`, `siteName`) | yes | P0 — shorten title/desc, add `locale: "vi_VN"`, `siteName`, Twitter card |
| `src/app/slowenglish/page.tsx` | 71 (**over 60**) | 175 (**over 160**) | yes (missing `locale`, `siteName`) | yes | P0 — shorten title/desc, add `locale: "vi_VN"`, `siteName`, Twitter card |
| `src/app/hoclamtoolvideochonguoimoibatdau/page.tsx` | 78 (**over 60**) | 198 (**over 160**) | yes (missing `locale`, `siteName`) | yes | P0 — shorten title/desc, add `locale: "vi_VN"`, `siteName`, Twitter card |
| `src/app/hocchuaxongtiendave/page.tsx` | 81 (**over 60**) | 214 (**over 160**) | yes (missing `locale`, `siteName`) | yes | P0 — shorten title/desc, add `locale: "vi_VN"`, `siteName`, Twitter card |
| `src/app/sanphamso/page.tsx` | 56 | 174 (**over 160**) | yes (missing `locale`, `siteName`) | yes | P0 — trim desc to <160, add `locale: "vi_VN"`, `siteName`, Twitter card |
| `src/app/cafe/page.tsx` | 67 (**over 60**) | 154 | yes (missing `locale`, `siteName`) | yes | P1 — shorten title, add `locale: "vi_VN"`, `siteName`, Twitter card |

### Public legal pages (P1)

| Page | Title len | Desc len | Has OG | Has canonical | Priority fix |
|---|---|---|---|---|---|
| `src/app/privacy/page.tsx` | 50 | 178 (**over 160**) | yes (no `images`, no `type`, no `locale`, no `url`) | yes | P1 — trim desc, add OG `type`/`locale`/`url`/`images`, add Twitter card |
| `src/app/terms/page.tsx` | 47 | 169 (**over 160**) | yes (no `images`, no `type`, no `locale`, no `url`) | yes | P1 — trim desc, add OG `type`/`locale`/`url`/`images`, add Twitter card |
| `src/app/refund-policy/page.tsx` | 48 | 109 | yes (no `images`, no `type`, no `locale`, no `url`) | yes | P1 — add OG `type: "website"`, `locale: "vi_VN"`, `url`, `images`, Twitter card |
| `src/app/(dashboard)/privacy-policy/page.tsx` | 46 | 116 | NO | NO | P2 — internal duplicate of `/privacy`; redirect to canonical `/privacy` or add `alternates.canonical: ${BASE_URL}/privacy` + `robots: noindex` |
| `src/app/(dashboard)/terms-of-service/page.tsx` | 46 | 87 | NO | NO | P2 — internal duplicate of `/terms`; add `alternates.canonical: ${BASE_URL}/terms` + `robots: noindex` |

### Auth / utility / per-user pages (P2)

These are `robots: { index: false, follow: false }` or should be. Full OG/Twitter is not required, but `alternates.canonical` is still useful to consolidate URL variants.

| Page | Title len | Desc len | Has OG | Has canonical | Priority fix |
|---|---|---|---|---|---|
| `src/app/login/page.tsx` | 38 | 113 | NO | NO | P2 — keep noindex; add canonical for hygiene |
| `src/app/register/page.tsx` | 40 | 113 | NO | yes | P2 — keep current; optionally add OG for social shares |
| `src/app/register/verify/page.tsx` | n/a | n/a | NO | NO | P2 — confirm `robots: noindex` |
| `src/app/forgot-password/page.tsx` | 41 | 51 | NO | NO | P2 — noindex set; add canonical |
| `src/app/reset-password/page.tsx` | n/a | n/a | NO | NO | P2 — add noindex + canonical |
| `src/app/complete-profile/page.tsx` | 38 | (none) | NO | NO | P2 — noindex set; add description for clarity |
| `src/app/verify/[id]/page.tsx` | 41 | (none) | NO | NO | P2 — add description; allow indexing if intended |
| `src/app/cart/page.tsx` | 39 | 110 | NO | yes | P2 — noindex set; OK |
| `src/app/checkout/page.tsx` | 39 | 132 | NO | yes | P2 — noindex set; OK |
| `src/app/checkout/success/page.tsx` | 45 | 95 | NO | yes | P2 — noindex set; OK |
| `src/app/orders/track/page.tsx` | 42 | 87 | NO | NO | P2 — noindex set; add canonical for hygiene |
| `src/app/orders/[orderCode]/page.tsx` | 47 | 38 | NO | NO | P2 — noindex set; per-user, OK |
| `src/app/affiliate/page.tsx` | NO METADATA | NO METADATA | NO | NO | P1 — add full metadata; public marketing page |
| `src/app/email/unsubscribe/page.tsx` | NO METADATA | NO METADATA | NO | NO | P2 — add `robots: noindex` + title |

### Dashboard / authenticated pages (P2–P3)

Most of these are per-user dashboards or admin tools. They should generally be `noindex` and do not need full OG. Items listed as `NO METADATA` need at least a `title` for browser tab clarity and `robots: { index: false, follow: false }`.

| Page | Has metadata | Priority fix |
|---|---|---|
| `src/app/(dashboard)/certificate/[slug]/page.tsx` | title only | P2 — keep; optional OG since shared socially |
| `src/app/(dashboard)/dashboard/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/dashboard/affiliate/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/community/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/events/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/leaderboard/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/notifications/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/resources/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/settings/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/subscriptions/page.tsx` | no | P2 — add title + `robots: noindex` |
| `src/app/(dashboard)/instructor/**` (5 pages) | no | P2 — add titles + `robots: noindex` |
| `src/app/(dashboard)/email/**` (12 pages) | no | P3 — admin-only; add titles + `robots: noindex` |
| `src/app/(dashboard)/crm/**` (8 pages) | no | P3 — admin-only; add titles + `robots: noindex` |
| `src/app/(dashboard)/marketing/**` (7 pages) | no | P3 — admin-only; add titles + `robots: noindex` |
| `src/app/(dashboard)/sale/dashboard/page.tsx` | no | P3 — admin-only; add title + `robots: noindex` |
| `src/app/(dashboard)/admin/**` (38 pages) | title only on `products/new`; rest none | P3 — admin-only; add titles + `robots: noindex` site-wide via segment layout |

## Recommended global remediation

1. Add a route-segment `layout.tsx` for `(dashboard)/admin` and other private segments that sets `export const metadata = { robots: { index: false, follow: false } }`. Page-level titles inherit and override naturally.
2. Centralize the OG image fallback (`${BASE_URL}/images/hero/offer-banner.jpg`) and `siteName` in a helper `getDefaultOpenGraph(path)` in `src/lib/seo.ts` to enforce consistency on `locale: "vi_VN"`, `type: "website"`, Twitter card, canonical.
3. For all over-length titles/descriptions on the P0 landing pages, regenerate copy targeting ≤55 / ≤155 chars to leave headroom for SERP truncation.
4. For the duplicate `/privacy` vs `/(dashboard)/privacy-policy` and `/terms` vs `/(dashboard)/terms-of-service`, either redirect the duplicates or use `alternates.canonical` to point to the public canonical URL to avoid duplicate-content penalties.
