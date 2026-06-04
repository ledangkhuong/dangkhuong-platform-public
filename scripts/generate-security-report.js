const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

// ── Color palette ──
const COLORS = {
  primary: "1B4F72",
  critical: "C0392B",
  criticalBg: "FADBD8",
  high: "E67E22",
  highBg: "FDEBD0",
  medium: "F39C12",
  mediumBg: "FEF9E7",
  low: "27AE60",
  lowBg: "D5F5E3",
  info: "2980B9",
  infoBg: "D6EAF8",
  headerBg: "1B4F72",
  headerText: "FFFFFF",
  lightGray: "F2F3F4",
  borderColor: "D5D8DC",
  darkText: "2C3E50",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.borderColor };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// ── ALL FINDINGS (deduplicated across 20 agents) ──
const findings = [
  // ═══ CRITICAL ═══
  {
    id: "C-01",
    severity: "CRITICAL",
    title: "CRON_SECRET not set — cron endpoints accept 'Bearer undefined'",
    files: [
      "src/app/api/cron/abandoned-cart/route.ts",
      "src/app/api/cron/expire-subscriptions/route.ts",
      ".env.local (missing CRON_SECRET)"
    ],
    description: "Both cron endpoints authenticate via Bearer ${process.env.CRON_SECRET}. Since CRON_SECRET is not defined, the comparison becomes 'Bearer undefined'. An attacker who sends Authorization: Bearer undefined passes the auth check and can trigger mass abandoned-cart emails or force-expire active subscriptions.",
    impact: "Mass email abuse, subscription denial-of-service, financial loss from premature subscription expirations.",
    fix: "1. Generate a strong random secret: openssl rand -hex 32\n2. Set CRON_SECRET in both .env.local and Vercel environment variables.\n3. Add a runtime guard: if (!process.env.CRON_SECRET) return 401 immediately.\n4. Consider verifying x-vercel-cron-signature header on Vercel Pro plans."
  },
  {
    id: "C-02",
    severity: "CRITICAL",
    title: "INTERNAL_WEBHOOK_SECRET uses placeholder value 'change-me-to-a-random-secret'",
    files: [".env.local (line 33)"],
    description: "The secret used to authenticate internal webhook calls (subscription confirmation, etc.) is set to a trivially guessable placeholder string.",
    impact: "An attacker can forge internal webhook calls, potentially confirming subscriptions without payment or triggering other internal actions.",
    fix: "Replace with a cryptographically random value: openssl rand -hex 32. Update both .env.local and Vercel environment variables."
  },
  {
    id: "C-03",
    severity: "CRITICAL",
    title: "Email list subscribers — completely unauthenticated CRUD with admin client",
    files: ["src/app/api/email/lists/[id]/subscribers/route.ts (GET, POST, DELETE)"],
    description: "All three HTTP methods (GET, POST, DELETE) use createAdminClient() with zero authentication. Anyone can list all subscribers (exposing emails/names), add arbitrary subscribers to any list, or remove subscribers by guessing list UUIDs.",
    impact: "Full exposure of email subscriber PII, ability to manipulate mailing lists, potential GDPR/spam compliance violations.",
    fix: "Add getUser() authentication + admin/manager role check to all three HTTP methods before any database operation."
  },
  {
    id: "C-04",
    severity: "CRITICAL",
    title: "Email template endpoints — unauthenticated access with admin client",
    files: [
      "src/app/api/email/templates/[id]/duplicate/route.ts",
      "src/app/api/email/templates/[id]/preview/route.ts"
    ],
    description: "No authentication whatsoever. Anyone can duplicate any email template (filling the database) or preview template HTML content (leaking branding, internal links, business logic).",
    impact: "Information disclosure, potential DB storage abuse, intellectual property exposure.",
    fix: "Add authentication (getUser()) and admin/manager role verification to both endpoints."
  },
  {
    id: "C-05",
    severity: "CRITICAL",
    title: "Health endpoint leaks customer PII and infrastructure details",
    files: ["src/app/api/health/route.ts"],
    description: "Completely unauthenticated. When called with ?check=orders, returns stuck order details including customer_name, customer_email, order_code, and amount for up to 20 orders. Also reveals which services (SePay, Resend, Supabase) are configured.",
    impact: "Direct PII data leak of customer names/emails/order details. Infrastructure fingerprinting enables targeted attacks.",
    fix: "1. Remove the ?check=orders functionality entirely, or gate it behind admin auth + CRON_SECRET.\n2. Strip basic health check down to a simple ok/fail response without revealing which services are configured."
  },
  {
    id: "C-06",
    severity: "CRITICAL",
    title: "Coupon used_count TOCTOU race condition — non-atomic increment",
    files: ["src/app/api/orders/create/route.ts (lines 115-158, 262-276)"],
    description: "Coupon validation reads used_count, checks against max_uses, then later increments using the stale value (appliedCouponUsedCount + 1). Two concurrent requests can both read used_count=4 when max_uses=5, both pass, both set used_count=5. A single-use coupon could be used multiple times with concurrent requests.",
    impact: "Direct financial loss — attackers can redeem limited-use coupons beyond their intended limit.",
    fix: "Create an atomic SQL RPC function:\nCREATE OR REPLACE FUNCTION claim_coupon(p_coupon_id uuid) RETURNS boolean AS $$\n  UPDATE coupons SET used_count = used_count + 1\n  WHERE id = p_coupon_id AND (max_uses IS NULL OR used_count < max_uses)\n  RETURNING true;\n$$ LANGUAGE sql;\n\nCall this RPC after order creation and roll back if it returns no rows."
  },
  {
    id: "C-07",
    severity: "CRITICAL",
    title: "profiles table RLS policy USING(true) exposes all users' PII",
    files: ["supabase/migrations/ (profiles RLS policy)"],
    description: "The profiles table has a SELECT RLS policy with USING(true), meaning any authenticated user can query any other user's profile data including full_name, phone, avatar_url, and account_manager_id.",
    impact: "Full PII exposure of all registered users to any authenticated user. Privacy violation.",
    fix: "Replace USING(true) with USING(auth.uid() = id) for the general SELECT policy. Create a separate staff-only policy for admin/manager roles that need to view all profiles."
  },
  {
    id: "C-08",
    severity: "CRITICAL",
    title: "Mass assignment in admin course creation",
    files: ["src/app/api/admin/courses/route.ts"],
    description: "The admin course creation endpoint passes the entire req.json() body directly to .insert(body). An attacker with admin access can inject arbitrary database columns including is_featured, created_at, or any other field the courses table accepts.",
    impact: "Privilege escalation within admin panel, data integrity compromise, potential business logic bypass.",
    fix: "Destructure only the expected fields from the request body:\nconst { title, description, price, ... } = await req.json();\nThen pass only those specific fields to .insert()."
  },
  {
    id: "C-09",
    severity: "CRITICAL",
    title: "Multiple tables likely have NO RLS policies",
    files: [
      "subscription_plans (table)",
      "user_subscriptions (table)",
      "coupons (table)",
      "coupon_usages (table)"
    ],
    description: "These tables appear to have no Row Level Security policies defined. Combined with the widespread use of createAdminClient() (200+ locations), data in these tables may be accessible beyond intended access patterns.",
    impact: "Potential unauthorized read/write access to subscription plans, user subscription data, and coupon information.",
    fix: "1. Enable RLS on all tables: ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;\n2. Create appropriate SELECT/INSERT/UPDATE/DELETE policies for each table.\n3. Audit all createAdminClient() usage — replace with createClient() (RLS-aware) wherever possible."
  },

  // ═══ HIGH ═══
  {
    id: "H-01",
    severity: "HIGH",
    title: "PostgREST .or() filter injection in 5 endpoints",
    files: [
      "src/lib/actions/crm.ts (CRM contacts search)",
      "src/app/api/email/subscribers/route.ts",
      "src/app/api/admin/orders/route.ts",
      "src/app/api/email/campaigns/route.ts",
      "src/app/api/email/templates/route.ts"
    ],
    description: "User-supplied search strings are interpolated directly into PostgREST .or() filter expressions without sanitization. An attacker can inject additional filter clauses like: search=test),secret_field.eq.value,email.ilike.(%25 to access columns not intended for search or extract data through boolean-based blind injection.",
    impact: "Data exfiltration, unauthorized column access, potential bypass of intended query restrictions.",
    fix: "Sanitize all user input before passing to .or() filters. Escape parentheses, commas, and dots:\nconst safeSearch = search.replace(/[(),.*]/g, '');\nOr better, use parameterized .ilike() calls instead of .or() string interpolation."
  },
  {
    id: "H-02",
    severity: "HIGH",
    title: "Turnstile CAPTCHA implemented but never verified server-side",
    files: [
      "src/components/TurnstileWidget.tsx (client-side widget)",
      "src/lib/turnstile.ts (verifyTurnstile function exists)",
      "All registration/order endpoints (missing verification call)"
    ],
    description: "Cloudflare Turnstile widget is rendered on registration and order forms, and a verifyTurnstile() utility function exists, but no server-side endpoint actually calls this function to verify the token. Bots can bypass the CAPTCHA entirely by simply not sending the token.",
    impact: "Bot abuse of registration, order creation, and other form endpoints. Spam account creation.",
    fix: "Add await verifyTurnstile(turnstileToken) at the beginning of every registration and order creation endpoint. Return 400 if verification fails."
  },
  {
    id: "H-03",
    severity: "HIGH",
    title: "Email campaign sub-routes have auth but NO role check (5 routes)",
    files: [
      "src/app/api/email/campaigns/[id]/analytics/route.ts",
      "src/app/api/email/campaigns/[id]/cleanup/route.ts",
      "src/app/api/email/campaigns/[id]/continue/route.ts",
      "src/app/api/email/campaigns/[id]/duplicate/route.ts",
      "src/app/api/email/campaigns/[id]/pause/route.ts"
    ],
    description: "All five routes check getUser() (logged in) but do NOT check the user's role. Any authenticated user (including regular students) can view campaign analytics, trigger mass email sends via /continue, duplicate campaigns, and pause active sends.",
    impact: "Regular users can trigger mass email campaigns, view marketing analytics, and disrupt email operations.",
    fix: "Add role check (admin/manager) immediately after getUser() in all five routes. The /send route already does this correctly — copy its pattern."
  },
  {
    id: "H-04",
    severity: "HIGH",
    title: "CSP includes unsafe-inline and unsafe-eval",
    files: ["next.config.ts (line 63)"],
    description: "The Content Security Policy script-src directive includes both 'unsafe-inline' and 'unsafe-eval'. unsafe-eval was added for html2canvas. This combination effectively neutralizes CSP as an XSS mitigation — any injected script will execute.",
    impact: "CSP provides no protection against XSS attacks. All other XSS mitigations become critical single points of failure.",
    fix: "1. Replace html2canvas with a library that does not require eval() (html-to-image, dom-to-image-more).\n2. Replace 'unsafe-inline' with nonce-based or hash-based script loading.\n3. If immediate removal isn't possible, scope unsafe-eval to only the pages that need it using per-route headers."
  },
  {
    id: "H-05",
    severity: "HIGH",
    title: "AutoPixel injects DB-sourced pixel_id into inline script without escaping",
    files: ["src/components/AutoPixel.tsx"],
    description: "The Facebook pixel_id value from the database is interpolated directly into an inline <script> tag without any escaping or validation. If an attacker can modify the pixel_id in the database (e.g., via admin panel), they can inject arbitrary JavaScript that executes for all site visitors.",
    impact: "Stored XSS affecting all visitors. Could be used for credential theft, crypto mining, or site defacement.",
    fix: "1. Validate pixel_id is numeric-only before rendering: /^\\d+$/.test(pixelId)\n2. Use textContent or data attributes instead of inline script interpolation.\n3. Move pixel initialization to a separate static JS file that reads the ID from a data attribute."
  },
  {
    id: "H-06",
    severity: "HIGH",
    title: "Notification links from DB used in window.location.href without validation",
    files: ["src/components/notifications/ (notification click handlers)"],
    description: "When a user clicks a notification, the link URL stored in the database is used directly in window.location.href without validation. A malicious notification (e.g., inserted by compromised admin) could contain a javascript: URL or redirect to a phishing site.",
    impact: "XSS via javascript: URLs, open redirect to phishing sites.",
    fix: "Validate notification URLs before navigation:\n1. Parse with new URL() and check protocol is http: or https:\n2. Optionally restrict to same-origin URLs only.\n3. Reject javascript:, data:, and other dangerous schemes."
  },
  {
    id: "H-07",
    severity: "HIGH",
    title: "No Origin/Referer validation on API routes",
    files: ["src/middleware.ts (lines 20-21, API exclusion)"],
    description: "The middleware explicitly excludes all /api routes from CSRF-like protections. Combined with cookie-based auth (SameSite=Lax), cross-origin POST requests via fetch() from malicious sites could execute authenticated actions if the browser sends cookies.",
    impact: "Cross-site request forgery on all API endpoints. An attacker can craft a malicious page that makes authenticated API calls on behalf of a logged-in user.",
    fix: "1. Add Origin header validation in middleware for /api routes.\n2. Or implement a custom CSRF token that is sent as a header (not cookie) on state-changing requests.\n3. At minimum, verify that the Origin header matches the expected domain for POST/PUT/DELETE requests."
  },
  {
    id: "H-08",
    severity: "HIGH",
    title: "4 check-email endpoints enable user enumeration",
    files: [
      "src/app/api/geminipro/check-email/route.ts",
      "src/app/api/hoclamtoolvideo/check-email/route.ts",
      "src/app/api/hocchuaxongtiendave/check-email/route.ts",
      "src/app/api/updateveo31/check-email/route.ts"
    ],
    description: "Public endpoints return { exists: true, fullName: '...' } for any email address. Enables user enumeration and reveals the registered name associated with email addresses.",
    impact: "User enumeration for phishing/social engineering. PII disclosure (full name) of registered users.",
    fix: "1. Return a consistent response regardless of whether the email exists.\n2. Remove fullName from the response entirely.\n3. If the functionality is needed, use a signed token approach where only the landing page can validate."
  },
  {
    id: "H-09",
    severity: "HIGH",
    title: "200+ uses of createAdminClient bypassing all RLS",
    files: ["Throughout the codebase (200+ locations)"],
    description: "The Supabase admin client (service role key) is used extensively throughout the application, bypassing all Row Level Security policies. This means RLS serves as decoration rather than a security boundary — any application-level auth bug immediately exposes all data.",
    impact: "RLS provides zero defense-in-depth. Every application-level authorization check is a single point of failure.",
    fix: "Systematic migration plan:\n1. Audit all 200+ createAdminClient() calls.\n2. For each, determine if the admin client is truly needed (e.g., user management) or if createClient() (RLS-aware) would suffice.\n3. Replace with createClient() where possible — likely 60-70% of usage.\n4. For remaining admin client usage, add explicit authorization checks."
  },
  {
    id: "H-10",
    severity: "HIGH",
    title: "No per-user coupon usage limit",
    files: ["src/app/api/orders/create/route.ts (lines 115-158)"],
    description: "Although coupon_usages records are inserted after order creation, the code never checks whether the current user has already used this coupon. A user can apply the same coupon across multiple orders indefinitely, as long as the global used_count < max_uses.",
    impact: "Financial loss — a single user can consume all uses of a coupon meant for multiple customers.",
    fix: "Before applying the coupon, query coupon_usages to check if this user already used it:\nconst { count } = await admin.from('coupon_usages').select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id).eq('user_id', user.id);\nif (count > 0) return error 400;"
  },
  {
    id: "H-11",
    severity: "HIGH",
    title: "Manager can escalate privileges — assign manager role to any user",
    files: ["src/app/api/admin/users/ (user role management)"],
    description: "A user with the 'manager' role can change another user's role to 'manager', effectively creating new managers without admin approval. There is no restriction that only admin can promote to manager level.",
    impact: "Privilege escalation — a single compromised manager account can create unlimited additional managers.",
    fix: "Add a check: only users with role='admin' can assign the 'manager' role. Managers should only be able to assign roles below their level (e.g., 'sale', 'marketing')."
  },
  {
    id: "H-12",
    severity: "HIGH",
    title: "Admin announcements GET endpoint has auth but no role check",
    files: ["src/app/api/admin/announcements/route.ts"],
    description: "Checks getUser() but not the user's role. Any authenticated student can list all admin announcements via createAdminClient, including unpublished/draft announcements.",
    impact: "Information disclosure of internal admin communications.",
    fix: "Add admin/manager role check for the GET handler."
  },
  {
    id: "H-13",
    severity: "HIGH",
    title: "Admin promotions and featured-courses GET — no auth for full list",
    files: [
      "src/app/api/admin/promotions/route.ts",
      "src/app/api/admin/featured-courses/route.ts"
    ],
    description: "Both GET endpoints use createAdminClient() with no authentication when ?active=true is NOT set. Without the query param, anyone can retrieve ALL records including inactive/draft ones.",
    impact: "Information disclosure of unpublished promotions and marketing strategy.",
    fix: "When ?active=true is absent, require admin/manager role. The public-facing path (?active=true) can remain unauthenticated."
  },
  {
    id: "H-14",
    severity: "HIGH",
    title: "Sale user can reassign any CRM contact to themselves",
    files: ["src/app/api/crm/contacts/[id]/assign/route.ts"],
    description: "A user with the 'sale' role can call the contact assignment endpoint to reassign any contact to themselves or to any other sale user, without restriction.",
    impact: "Sales data manipulation — a sale user can steal leads from other team members.",
    fix: "Add business logic: sale users can only be assigned contacts by managers/admins, not self-assign. Or restrict the endpoint to admin/manager roles only."
  },
  {
    id: "H-15",
    severity: "HIGH",
    title: "forgotPassword server action has no rate limiting",
    files: ["src/lib/actions/auth.ts (forgotPassword function)"],
    description: "The password reset function has no rate limiting. An attacker can trigger unlimited password reset emails for any email address, causing email spam and potential account lockout concerns.",
    impact: "Email bombing of users, potential service abuse costs via email provider.",
    fix: "Add IP-based rate limiting (e.g., 3 requests per email per hour, 10 requests per IP per hour). Use the existing rateLimit utility."
  },
  {
    id: "H-16",
    severity: "HIGH",
    title: "Payout request TOCTOU — double payout possibility",
    files: ["src/lib/actions/affiliate.ts (lines 86-132)"],
    description: "The requestPayout function reads total_earned/total_paid, computes available balance, checks for pending payouts, then inserts. Two simultaneous requests can both pass the 'no pending payout' check and both insert a payout row for the full balance.",
    impact: "Double payout requests — admin could approve both, resulting in overpayment.",
    fix: "Add a unique partial index:\nCREATE UNIQUE INDEX idx_one_pending_payout_per_affiliate ON affiliate_payouts (affiliate_id) WHERE status = 'pending';\nHandle the constraint violation in application code."
  },
  {
    id: "H-17",
    severity: "HIGH",
    title: "sanitize-html allows style attribute on all elements",
    files: ["src/lib/sanitize.ts (line 33)"],
    description: "The sanitizer config allows the style attribute on all elements ('*': ['class', 'id', 'style', 'data-*']). This enables CSS-based attacks including data exfiltration via background: url(), UI redressing via position: fixed, and content spoofing.",
    impact: "CSS injection in blog posts and user-generated content. Data exfiltration and phishing within the site.",
    fix: "Remove 'style' from the wildcard allowed attributes. Use sanitize-html's allowedStyles option to whitelist only specific safe CSS properties (text-align, color, font-weight, font-size)."
  },

  // ═══ MEDIUM ═══
  {
    id: "M-01",
    severity: "MEDIUM",
    title: "No UUID format validation on admin API endpoints",
    files: ["Multiple admin API routes (orders, users, courses, etc.)"],
    description: "Many admin endpoints accept ID parameters from the URL without validating UUID format. Malformed IDs pass through to Supabase queries, which may return unexpected errors or expose internal error details.",
    impact: "Information leakage via error messages, potential for NoSQL injection patterns.",
    fix: "Add UUID validation at the top of each handler:\nconst uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\nif (!uuidRegex.test(id)) return 400;"
  },
  {
    id: "M-02",
    severity: "MEDIUM",
    title: "Supabase error messages leaked to API clients",
    files: ["Multiple API routes"],
    description: "Many endpoints return Supabase error messages directly to the client (e.g., return NextResponse.json({ error: error.message })). These messages can reveal table names, column names, constraint names, and other internal database schema details.",
    impact: "Information disclosure aiding attackers in understanding database structure.",
    fix: "Return generic error messages to clients. Log the detailed Supabase error server-side only:\nconsole.error('DB error:', error);\nreturn NextResponse.json({ error: 'An error occurred' }, { status: 500 });"
  },
  {
    id: "M-03",
    severity: "MEDIUM",
    title: "No rate limiting on CRM server actions",
    files: ["src/lib/actions/crm.ts"],
    description: "CRM operations (create contact, update contact, assign contact, bulk operations) have no rate limiting. A compromised sale account could rapidly modify or export CRM data.",
    impact: "Data manipulation or exfiltration via rapid API calls.",
    fix: "Add rate limiting to CRM server actions using the existing rateLimit utility. Suggested: 30 requests/minute for reads, 10 requests/minute for writes."
  },
  {
    id: "M-04",
    severity: "MEDIUM",
    title: "Blog content stored unsanitized — sanitization only at render time",
    files: ["src/app/api/blog/route.ts (lines 99-112)"],
    description: "The blog API stores raw HTML content directly into the database without server-side sanitization. Sanitization only happens at render time via sanitizeHtml(). If any other rendering path or API consumer accesses this content without sanitization, it becomes an XSS vector.",
    impact: "Stored XSS if any code path renders blog content without calling sanitizeHtml().",
    fix: "Add server-side sanitization in the POST /api/blog handler before storing to the database. This creates defense-in-depth: sanitize both at storage and at render."
  },
  {
    id: "M-05",
    severity: "MEDIUM",
    title: "Affiliate click counter has non-atomic increment",
    files: ["src/app/api/affiliate/click/route.ts (lines 66-69)"],
    description: "The click counter uses a read-then-write pattern: total_clicks: (affiliate.total_clicks || 0) + 1. Two concurrent clicks can both read the same value, resulting in a lost update. This was already fixed for total_earned/total_conversions using increment_affiliate_stats RPC, but was missed for click counting.",
    impact: "Inaccurate click analytics. Low direct financial impact but affects business decisions.",
    fix: "Create an atomic increment RPC:\nCREATE OR REPLACE FUNCTION increment_affiliate_clicks(p_affiliate_id uuid) RETURNS void AS $$\n  UPDATE affiliates SET total_clicks = total_clicks + 1, updated_at = now() WHERE id = p_affiliate_id;\n$$ LANGUAGE sql;"
  },
  {
    id: "M-06",
    severity: "MEDIUM",
    title: "Slug not escaped in blog email HTML template",
    files: ["src/app/api/blog/route.ts (line 269)"],
    description: "In sendBlogNotificationEmail(), the post.slug is interpolated directly into the email HTML without escaping. While the slug regex strips most special characters, it still allows '-' and can be manually set by the user. A crafted slug containing '\"' could break out of the href attribute.",
    impact: "Email HTML injection, potential phishing via manipulated email links.",
    fix: "Apply encodeURIComponent(post.slug) for the URL portion, or use escapeHtml() on the entire URL string in the template."
  },
  {
    id: "M-07",
    severity: "MEDIUM",
    title: "Journey route allows viewing other users' events without role check",
    files: ["src/app/api/journey/route.ts (line 16)"],
    description: "Any authenticated user can pass ?user_id=<victim_id> to view another user's learning journey events. Only is_public=true events are filtered, but there is no admin/instructor role check for viewing other users' data.",
    impact: "Partial IDOR — user enumeration and access to other users' public learning data.",
    fix: "Restrict the user_id parameter to admin/manager/instructor roles. Regular users should only see their own journey."
  },
  {
    id: "M-08",
    severity: "MEDIUM",
    title: "Orders check-status endpoint — no auth, no rate limit",
    files: ["src/app/api/orders/check-status/route.ts"],
    description: "Unauthenticated endpoint that returns order payment status for any order_code. If order codes are sequential or guessable, an attacker can enumerate order statuses.",
    impact: "Information disclosure — order status enumeration.",
    fix: "Add a signed token or short-lived HMAC to prevent order status enumeration. Include the token in the landing page polling URL so only the order creator can check status."
  },
  {
    id: "M-09",
    severity: "MEDIUM",
    title: "Seed migration committed to version control",
    files: ["supabase/migrations/20260519_seed_hocchuaxongtiendave_product.sql"],
    description: "A seed script with specific pricing data is in the migrations folder. If migrations run automatically in production CI/CD, the ON CONFLICT ... DO UPDATE clause could overwrite current product prices.",
    impact: "Accidental price reversion in production during deployment.",
    fix: "Move seed data to a separate supabase/seed.sql or scripts/seed-*.sql directory that is never run in production CI/CD."
  },
  {
    id: "M-10",
    severity: "MEDIUM",
    title: "Admin client bypasses RLS for all blog operations",
    files: ["src/app/api/blog/route.ts (lines 29, 87, 201)"],
    description: "The blog API uses createAdminClient() for all database operations, bypassing RLS entirely. While application code checks roles, the RLS policies on blog_posts are a secondary defense only.",
    impact: "If any code path omits the role check, RLS won't protect blog data.",
    fix: "Use the regular Supabase client (createClient()) for operations where possible, reserving the admin client only for operations that genuinely need to bypass RLS."
  },

  // ═══ LOW ═══
  {
    id: "L-01",
    severity: "LOW",
    title: "Coupon code minimum length allows brute-force enumeration",
    files: ["src/app/api/coupons/validate/route.ts", "src/app/api/admin/coupons/ (creation)"],
    description: "Coupon codes have a minimum length of 3 characters (36^3 = 46,656 possibilities). Rate limiting exists (10/min/IP) but enumeration is feasible across multiple IPs. Distinct error messages for 'does not exist' vs 'expired' vs 'used up' help attackers confirm valid codes.",
    impact: "Coupon code discovery enabling unauthorized discounts.",
    fix: "1. Enforce minimum 8-character coupon codes.\n2. Unify error messages into a single generic 'Invalid coupon code' response."
  },
  {
    id: "L-02",
    severity: "LOW",
    title: "No CSRF token on blog CRUD API",
    files: ["src/app/api/blog/route.ts"],
    description: "Blog CRUD API routes do not implement CSRF protection. While Supabase cookies use SameSite=Lax, this only blocks cross-origin POST requests from forms. Fetch requests may still work.",
    impact: "Cross-site blog post creation/deletion (partially mitigated by SameSite=Lax cookies).",
    fix: "Add a custom header check (e.g., verify X-Requested-With) for additional CSRF protection."
  },
  {
    id: "L-03",
    severity: "LOW",
    title: "No rate limiting on blog create/update/delete",
    files: ["src/app/api/blog/route.ts"],
    description: "Unlike the blog image upload (rate limited at 5/min), the blog CRUD API has no rate limiting. A compromised admin could rapidly create posts, and the email notification function could trigger mass email sends.",
    impact: "Resource exhaustion, mass email abuse via rapid blog post publishing.",
    fix: "Add rate limiting to blog POST and DELETE endpoints, particularly for the sendEmail=true path."
  },
  {
    id: "L-04",
    severity: "LOW",
    title: "Affiliate ref code change has no rate limit or cooldown",
    files: ["src/lib/actions/affiliate.ts (lines 269-300)"],
    description: "The changeRefCode server action allows unlimited code changes without cooldown. The distinct 'code_taken' error enables enumeration of existing vanity codes.",
    impact: "Code enumeration, code squatting/cycling of desirable vanity codes.",
    fix: "1. Add a cooldown (e.g., one change per 30 days).\n2. Return a generic error instead of confirming whether a specific code is taken."
  },
  {
    id: "L-05",
    severity: "LOW",
    title: "Community channels endpoint has no authentication",
    files: ["src/app/api/community/channels/route.ts"],
    description: "Returns all community channels without any authentication. While channels are likely not sensitive, this bypasses RLS and exposes internal community structure.",
    impact: "Information disclosure of community organization.",
    fix: "Consider requiring authentication if the community is for enrolled students only."
  },
  {
    id: "L-06",
    severity: "LOW",
    title: "User-supplied blog slug not sanitized",
    files: ["src/app/api/blog/route.ts (line 91)"],
    description: "The auto-generated slug is sanitized, but a user-supplied slug (slug?.trim()) is used as-is. A user could set slugs like '../../something' or 'admin/secret', creating confusing URLs.",
    impact: "URL manipulation, potential SEO confusion.",
    fix: "Apply the same sanitization regex to user-supplied slugs:\nconst finalSlug = (slug?.trim() || autoSlug).toLowerCase().replace(/[^\\w-]/g, '').replace(/--+/g, '-').slice(0, 80);"
  },
  {
    id: "L-07",
    severity: "LOW",
    title: "Migration scripts log infrastructure details and disable TLS verification",
    files: [
      "scripts/run-migration.mjs",
      "scripts/backfill-sticky-assign.mjs"
    ],
    description: "Scripts parse .env.local manually and log Supabase project references to stdout. They also use ssl: { rejectUnauthorized: false } which disables TLS certificate verification.",
    impact: "Information disclosure via logs, MITM vulnerability during migration runs.",
    fix: "Use dotenv for env parsing. Remove rejectUnauthorized: false. Reduce console output verbosity."
  },
];

// ── Helper functions ──
function severityColor(severity) {
  switch(severity) {
    case "CRITICAL": return COLORS.critical;
    case "HIGH": return COLORS.high;
    case "MEDIUM": return COLORS.medium;
    case "LOW": return COLORS.low;
    default: return COLORS.darkText;
  }
}

function severityBg(severity) {
  switch(severity) {
    case "CRITICAL": return COLORS.criticalBg;
    case "HIGH": return COLORS.highBg;
    case "MEDIUM": return COLORS.mediumBg;
    case "LOW": return COLORS.lowBg;
    default: return COLORS.lightGray;
  }
}

function makeHeaderCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: COLORS.headerText, font: "Arial", size: 20 })]
    })]
  });
}

function makeCell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        text,
        bold: opts.bold || false,
        color: opts.color || COLORS.darkText,
        font: "Arial",
        size: opts.size || 20
      })]
    })]
  });
}

// ── Count findings ──
const criticalCount = findings.filter(f => f.severity === "CRITICAL").length;
const highCount = findings.filter(f => f.severity === "HIGH").length;
const mediumCount = findings.filter(f => f.severity === "MEDIUM").length;
const lowCount = findings.filter(f => f.severity === "LOW").length;

// ── Build sections ──
const children = [];

// Title
children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({ text: "BÁO CÁO KIỂM TRA BẢO MẬT", bold: true, size: 52, color: COLORS.primary, font: "Arial" })]
}));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 100 },
  children: [new TextRun({ text: "DANGKHUONG.COM PLATFORM", bold: true, size: 40, color: COLORS.primary, font: "Arial" })]
}));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  children: [new TextRun({ text: "Security Audit Report", size: 28, color: "7F8C8D", font: "Arial", italics: true })]
}));

// Metadata table
children.push(new Table({
  width: { size: 5000, type: WidthType.DXA },
  columnWidths: [2000, 3000],
  alignment: AlignmentType.CENTER,
  rows: [
    ["Ngày thực hiện", "26/05/2026"],
    ["Phạm vi", "Full-stack security audit"],
    ["Số agent phân tích", "20 parallel agents"],
    ["Tổng lỗi phát hiện", `${findings.length} (${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low)`],
    ["Công nghệ", "Next.js 16 + Supabase + Vercel"],
  ].map(([label, value]) => new TableRow({
    children: [
      makeCell(label, 2000, { bold: true, fill: COLORS.lightGray }),
      makeCell(value, 3000),
    ]
  }))
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── EXECUTIVE SUMMARY ──
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 200, after: 200 },
  children: [new TextRun({ text: "1. TÓM TẮT TỔNG QUAN", bold: true, size: 32, color: COLORS.primary, font: "Arial" })]
}));

const summaryText = `Cuộc kiểm tra bảo mật được thực hiện bởi 20 agent AI chạy song song, mỗi agent tập trung vào một lĩnh vực bảo mật cụ thể. Tổng cộng phát hiện ${findings.length} lỗ hổng bảo mật, trong đó ${criticalCount} lỗi CRITICAL cần xử lý ngay lập tức, ${highCount} lỗi HIGH cần xử lý trong tuần, ${mediumCount} lỗi MEDIUM cần lên kế hoạch xử lý, và ${lowCount} lỗi LOW có thể xử lý khi có thời gian.`;

children.push(new Paragraph({
  spacing: { after: 200 },
  children: [new TextRun({ text: summaryText, size: 22, font: "Arial", color: COLORS.darkText })]
}));

// Summary stats table
children.push(new Paragraph({
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text: "Thống kê theo mức độ nghiêm trọng:", bold: true, size: 22, font: "Arial", color: COLORS.darkText })]
}));

children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2340, 2340, 2340, 2340],
  rows: [
    new TableRow({
      children: [
        makeCell(`CRITICAL: ${criticalCount}`, 2340, { bold: true, color: COLORS.critical, fill: COLORS.criticalBg, align: AlignmentType.CENTER }),
        makeCell(`HIGH: ${highCount}`, 2340, { bold: true, color: COLORS.high, fill: COLORS.highBg, align: AlignmentType.CENTER }),
        makeCell(`MEDIUM: ${mediumCount}`, 2340, { bold: true, color: COLORS.medium, fill: COLORS.mediumBg, align: AlignmentType.CENTER }),
        makeCell(`LOW: ${lowCount}`, 2340, { bold: true, color: COLORS.low, fill: COLORS.lowBg, align: AlignmentType.CENTER }),
      ]
    })
  ]
}));

// Key themes
children.push(new Paragraph({
  spacing: { before: 300, after: 100 },
  children: [new TextRun({ text: "Các chủ đề bảo mật chính:", bold: true, size: 22, font: "Arial", color: COLORS.darkText })]
}));

const themes = [
  "Authentication & Authorization: Nhiều API endpoint thiếu kiểm tra quyền hoặc hoàn toàn không yêu cầu đăng nhập",
  "Input Validation: Không có thư viện validation (Zod), PostgREST filter injection, thiếu UUID validation",
  "Secrets Management: CRON_SECRET trống, webhook secret dùng placeholder, .env.local chứa production keys",
  "Race Conditions: Coupon TOCTOU, affiliate payout double-request, non-atomic counters",
  "Row Level Security: profiles PII exposed, nhiều bảng thiếu RLS, 200+ admin client bypass",
  "XSS Vectors: AutoPixel injection, notification links, style attribute trong sanitizer, unsafe-eval CSP",
];

themes.forEach(theme => {
  children.push(new Paragraph({
    spacing: { after: 60 },
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text: theme, size: 20, font: "Arial", color: COLORS.darkText })]
  }));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── FINDINGS BY SEVERITY ──
const severityGroups = [
  { severity: "CRITICAL", label: "2. LỖI CRITICAL — Cần xử lý ngay lập tức", desc: "Các lỗ hổng cho phép truy cập trái phép vào dữ liệu nhạy cảm, tổn thất tài chính, hoặc chiếm quyền kiểm soát hệ thống." },
  { severity: "HIGH", label: "3. LỖI HIGH — Cần xử lý trong 1-2 tuần", desc: "Các lỗ hổng có thể bị khai thác để leo thang quyền, rò rỉ dữ liệu có chọn lọc, hoặc phá vỡ logic nghiệp vụ." },
  { severity: "MEDIUM", label: "4. LỖI MEDIUM — Cần lên kế hoạch xử lý", desc: "Các vấn đề giảm khả năng phòng thủ chuyên sâu hoặc tạo điều kiện cho các cuộc tấn công phức tạp hơn." },
  { severity: "LOW", label: "5. LỖI LOW — Xử lý khi có thời gian", desc: "Các vấn đề nhỏ, thường là hardening bổ sung hoặc best practices." },
];

severityGroups.forEach(group => {
  const groupFindings = findings.filter(f => f.severity === group.severity);

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: group.label, bold: true, size: 32, color: severityColor(group.severity), font: "Arial" })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: group.desc, size: 20, font: "Arial", italics: true, color: "7F8C8D" })]
  }));

  groupFindings.forEach(finding => {
    // Finding title bar
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1200, 8160],
      rows: [
        new TableRow({
          children: [
            makeCell(finding.id, 1200, { bold: true, color: "FFFFFF", fill: severityColor(finding.severity), align: AlignmentType.CENTER }),
            makeCell(finding.title, 8160, { bold: true, fill: severityBg(finding.severity) }),
          ]
        })
      ]
    }));

    // Files affected
    children.push(new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({ text: "File(s): ", bold: true, size: 18, font: "Arial", color: COLORS.darkText }),
        new TextRun({ text: finding.files.join(" | "), size: 18, font: "Consolas", color: "7F8C8D" }),
      ]
    }));

    // Description
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Mô tả: ", bold: true, size: 20, font: "Arial", color: COLORS.darkText }),
        new TextRun({ text: finding.description, size: 20, font: "Arial", color: COLORS.darkText }),
      ]
    }));

    // Impact
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Tác động: ", bold: true, size: 20, font: "Arial", color: COLORS.critical }),
        new TextRun({ text: finding.impact, size: 20, font: "Arial", color: COLORS.darkText }),
      ]
    }));

    // Fix
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Cách xử lý:", bold: true, size: 20, font: "Arial", color: COLORS.low }),
      ]
    }));

    finding.fix.split("\n").forEach(line => {
      children.push(new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        children: [new TextRun({ text: line, size: 19, font: "Consolas", color: COLORS.darkText })]
      }));
    });

    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  });

  children.push(new Paragraph({ children: [new PageBreak()] }));
});

// ── PRIORITY ACTION PLAN ──
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 200, after: 200 },
  children: [new TextRun({ text: "6. KẾ HOẠCH XỬ LÝ THEO THỨ TỰ ƯU TIÊN", bold: true, size: 32, color: COLORS.primary, font: "Arial" })]
}));

const phases = [
  {
    title: "PHASE 1 — Ngay lập tức (Trong ngày)",
    color: COLORS.critical,
    items: [
      "Tạo CRON_SECRET (openssl rand -hex 32) và set vào Vercel + .env.local",
      "Thay INTERNAL_WEBHOOK_SECRET bằng random secret thật",
      "Thêm auth + role check vào email/lists/subscribers, email/templates/duplicate, email/templates/preview",
      "Xóa hoặc bảo vệ /api/health?check=orders endpoint",
      "Sửa coupon race condition bằng atomic SQL RPC function",
    ]
  },
  {
    title: "PHASE 2 — Tuần 1",
    color: COLORS.high,
    items: [
      "Thêm role check vào 5 email campaign sub-routes (analytics, cleanup, continue, duplicate, pause)",
      "Sanitize tất cả PostgREST .or() filter inputs (5 endpoints)",
      "Gọi verifyTurnstile() server-side ở tất cả registration/order endpoints",
      "Fix profiles RLS: thay USING(true) bằng USING(auth.uid() = id) + staff policy",
      "Enable RLS trên subscription_plans, user_subscriptions, coupons, coupon_usages",
      "Thêm per-user coupon usage check trước khi apply coupon",
      "Fix mass assignment trong admin course creation (destructure specific fields)",
      "Thêm auth cho admin/promotions GET và admin/featured-courses GET",
      "Thêm role check cho admin/announcements GET",
      "Restrict manager role assignment to admin-only",
    ]
  },
  {
    title: "PHASE 3 — Tuần 2-3",
    color: COLORS.medium,
    items: [
      "Fix AutoPixel: validate pixel_id là numeric-only trước khi render",
      "Validate notification links: chỉ allow http/https protocol",
      "Thêm Origin header validation trong middleware cho /api routes",
      "Fix check-email endpoints: bỏ fullName, return consistent response",
      "Thêm rate limiting cho forgotPassword và CRM server actions",
      "Remove 'unsafe-eval' từ CSP (thay html2canvas bằng html-to-image)",
      "Remove 'style' từ sanitize-html allowed attributes",
      "Thêm UUID validation cho tất cả admin endpoints",
      "Return generic error messages thay vì Supabase error details",
      "Add unique partial index cho affiliate payouts (prevent double request)",
    ]
  },
  {
    title: "PHASE 4 — Tuần 4+ (Cải thiện dài hạn)",
    color: COLORS.low,
    items: [
      "Audit và migrate 200+ createAdminClient() calls sang createClient() nơi có thể",
      "Implement Zod validation cho tất cả API inputs",
      "Sanitize blog content at storage time (defense-in-depth)",
      "Enforce minimum 8-char coupon codes, unify error messages",
      "Add rate limiting cho blog CRUD API",
      "Move seed migrations ra khỏi migration folder",
      "Remove rejectUnauthorized: false từ migration scripts",
      "Add cooldown cho affiliate ref code changes",
    ]
  }
];

phases.forEach(phase => {
  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: phase.color } },
    children: [new TextRun({ text: phase.title, bold: true, size: 26, color: phase.color, font: "Arial" })]
  }));

  phase.items.forEach((item, idx) => {
    children.push(new Paragraph({
      spacing: { after: 60 },
      numbering: { reference: "actionNumbers", level: 0 },
      children: [new TextRun({ text: item, size: 20, font: "Arial", color: COLORS.darkText })]
    }));
  });
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── FULL FINDINGS TABLE ──
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 200, after: 200 },
  children: [new TextRun({ text: "7. BẢNG TỔNG HỢP TẤT CẢ LỖ HỔNG", bold: true, size: 32, color: COLORS.primary, font: "Arial" })]
}));

const tableRows = [
  new TableRow({
    children: [
      makeHeaderCell("ID", 800),
      makeHeaderCell("Severity", 1200),
      makeHeaderCell("Lỗ hổng", 5160),
      makeHeaderCell("Ưu tiên", 2200),
    ]
  })
];

const priorityMap = {
  "CRITICAL": "Ngay lập tức",
  "HIGH": "Tuần 1",
  "MEDIUM": "Tuần 2-3",
  "LOW": "Tuần 4+",
};

findings.forEach((f, idx) => {
  tableRows.push(new TableRow({
    children: [
      makeCell(f.id, 800, { size: 16, align: AlignmentType.CENTER }),
      makeCell(f.severity, 1200, { bold: true, color: severityColor(f.severity), fill: severityBg(f.severity), align: AlignmentType.CENTER, size: 16 }),
      makeCell(f.title, 5160, { size: 16 }),
      makeCell(priorityMap[f.severity], 2200, { align: AlignmentType.CENTER, size: 16 }),
    ]
  }));
});

children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [800, 1200, 5160, 2200],
  rows: tableRows,
}));

// ── Build document ──
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "actionNumbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.primary } },
          children: [
            new TextRun({ text: "Security Audit Report — dangkhuong.com", size: 16, color: "7F8C8D", font: "Arial", italics: true })
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 16, color: "7F8C8D", font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "7F8C8D", font: "Arial" }),
          ]
        })]
      })
    },
    children,
  }]
});

// ── Write file ──
const outputPath = "D:\\AI Agent\\dangkhuong-platform\\SECURITY-AUDIT-REPORT-2026-05-26.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Report generated:", outputPath);
  console.log(`Total findings: ${findings.length}`);
  console.log(`  CRITICAL: ${criticalCount}`);
  console.log(`  HIGH: ${highCount}`);
  console.log(`  MEDIUM: ${mediumCount}`);
  console.log(`  LOW: ${lowCount}`);
});
