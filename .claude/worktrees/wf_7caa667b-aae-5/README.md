# LMS Platform — Full-Stack Online Course Platform

A production-ready Learning Management System built with **Next.js 16**, **Supabase**, and **Tailwind CSS**. Includes Email Marketing, CRM, Payment Processing, Community, Affiliate Program, and more — everything you need to sell courses online.

---

## Features

This platform ships with **14 integrated modules** out of the box:

| # | Module | Description |
|---|--------|-------------|
| 1 | **Course Management** | Create courses with sections, lessons (video/text/quiz), drip scheduling, and attachments |
| 2 | **Student Dashboard** | Progress tracking, streaks, leaderboard, certificates, and personal notes |
| 3 | **Payment & Orders** | PayOS and SePay integration for one-time purchases and subscription billing |
| 4 | **Email Marketing** | Campaign builder, automation flows, subscriber management via AWS SES |
| 5 | **CRM** | Contact management, lead tracking, tags, segments, and activity timeline |
| 6 | **Blog / Content** | Full blog engine with rich editor, SEO metadata, RSS feed, and social sharing |
| 7 | **Community** | Discussion channels, posts, likes, comments, and real-time notifications |
| 8 | **Affiliate Program** | Referral tracking, commission management, and payout reporting |
| 9 | **Quizzes & Assessments** | Question bank, timed quizzes, grading, and score analytics |
| 10 | **Analytics** | Google Analytics 4, Facebook Pixel, web vitals, and admin analytics dashboard |
| 11 | **Notifications** | In-app notification center with real-time updates |
| 12 | **Coupons & Promotions** | Discount codes, percentage/fixed discounts, expiry dates |
| 13 | **Zalo OA Integration** | Zalo Official Account messaging and webhooks (Vietnam market) |
| 14 | **AI Chat** | Anthropic-powered AI assistant for student support |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Database & Auth | Supabase (PostgreSQL, Row-Level Security, Auth, Storage) |
| Styling | Tailwind CSS 4, shadcn/ui components |
| Email | AWS SES, Resend (fallback) |
| Payments | PayOS, SePay (Vietnamese gateways) |
| Rate Limiting | Upstash Redis (optional, falls back to in-memory) |
| Rich Text Editor | TipTap / Novel |
| Charts | Recharts |
| Bot Protection | Cloudflare Turnstile |
| Error Monitoring | Sentry |
| AI | Anthropic Claude SDK |
| Deployment | Vercel (recommended) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Supabase project (free tier works)
- A Vercel account (for deployment)

### 1. Clone the repository

```bash
git clone <your-repo-url> lms-platform
cd lms-platform
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your values. At minimum you need:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard > Settings > API
- `SUPABASE_SERVICE_ROLE_KEY` — same location, keep this secret
- `NEXT_PUBLIC_APP_URL` — your production domain

See `.env.example` for the full list with documentation.

### 3. Install dependencies

```bash
npm install
```

### 4. Set up the database

Run the Supabase migrations in order. You can execute these in the Supabase SQL Editor or using the Supabase CLI:

```bash
# If using Supabase CLI
supabase db push
```

Or manually run the SQL files from the `supabase/` directory in your Supabase SQL Editor, starting with `schema.sql` followed by the migration files in date order.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments. Add all environment variables from `.env.local` to your Vercel project settings.

---

## Environment Variables

All environment variables are documented in [`.env.example`](.env.example). Here is a summary by category:

| Category | Variables | Required |
|----------|-----------|----------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| **App URLs** | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | Yes |
| **PayOS** | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | For payments |
| **SePay** | `SEPAY_API_KEY`, `SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_CODE` | For bank transfers |
| **AWS SES** | `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY`, `AWS_SES_SECRET_KEY` | For email |
| **Sender** | `EMAIL_FROM`, `EMAIL_FROM_NAME` | For email |
| **Resend** | `RESEND_API_KEY` | Optional |
| **Analytics** | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_FB_PIXEL_ID` | Optional |
| **Sentry** | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional |
| **Turnstile** | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Optional |
| **Security** | `CRON_SECRET`, `INTERNAL_WEBHOOK_SECRET` | Recommended |
| **AI** | `ANTHROPIC_API_KEY` | Optional |
| **Zalo OA** | `ZALO_OA_ACCESS_TOKEN`, `ZALO_OA_SECRET_KEY`, `ZALO_OA_REFRESH_TOKEN` | Optional |
| **Redis** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional |

---

## Project Structure

```
lms-platform/
├── public/                     # Static assets (images, fonts)
├── supabase/                   # Database schema & migrations
│   ├── schema.sql              # Base database schema
│   └── migrations/             # Incremental migration files
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Authenticated routes
│   │   │   ├── admin/          # Admin panel (courses, orders, users, analytics)
│   │   │   ├── blog/           # Blog pages
│   │   │   ├── community/      # Community forum
│   │   │   ├── crm/            # CRM module
│   │   │   ├── email/          # Email marketing dashboard
│   │   │   ├── dashboard/      # Student dashboard
│   │   │   └── settings/       # User settings
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── courses/        # Course CRUD
│   │   │   ├── email/          # Email campaigns & automation
│   │   │   ├── orders/         # Order processing
│   │   │   ├── payos/          # PayOS webhook & callbacks
│   │   │   ├── sepay/          # SePay webhook
│   │   │   ├── community/      # Community API
│   │   │   ├── crm/            # CRM API
│   │   │   ├── affiliate/      # Affiliate tracking
│   │   │   ├── ai/             # AI chat endpoint
│   │   │   └── zalo/           # Zalo OA webhook
│   │   ├── auth/               # Auth pages (login, register, etc.)
│   │   ├── courses/            # Public course catalog
│   │   └── pricing/            # Pricing / sales pages
│   ├── components/             # Reusable React components
│   ├── lib/                    # Shared utilities
│   │   ├── supabase/           # Supabase client (browser & server)
│   │   ├── email/              # SES client, template renderer
│   │   ├── monitoring/         # Sentry setup
│   │   ├── actions/            # Server actions
│   │   ├── payos.ts            # PayOS helpers
│   │   ├── rate-limit.ts       # Rate limiting (Upstash / in-memory)
│   │   ├── turnstile.ts        # Cloudflare Turnstile verification
│   │   └── zalo-oa.ts          # Zalo OA client
│   └── types/                  # TypeScript type definitions
├── .env.example                # Environment variable template
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── vercel.json                 # Vercel deployment settings
└── package.json
```

---

## Customization

### Branding

1. **Site name & metadata** — Edit `src/lib/site-config.ts` to change the platform name, description, and default URLs.
2. **Logo & favicon** — Replace files in `public/` and `src/app/favicon.png`.
3. **Sender identity** — Update `EMAIL_FROM` and `EMAIL_FROM_NAME` in your `.env.local`.

### Colors & Theme

Tailwind CSS is configured in `tailwind.config.ts` and `src/app/globals.css`. Modify CSS custom properties to change the color scheme across the entire platform.

### Domain

1. Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` to your domain.
2. Update your Supabase project's Site URL and Redirect URLs in the Auth settings.
3. Configure your custom domain in Vercel.

### Payment Gateways

The platform includes PayOS and SePay (Vietnamese gateways). To add other gateways, implement a new payment handler in `src/lib/` following the pattern in `payos.ts`.

---

## Database Migrations

Migrations are located in `supabase/`. To apply them:

1. Open your Supabase project's SQL Editor
2. Run `schema.sql` first (creates the base tables)
3. Run each migration file in `supabase/migrations/` in chronological order

Or use the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables from `.env.local`
4. Deploy

### Other Platforms

The platform is a standard Next.js application and can be deployed anywhere that supports Next.js (AWS Amplify, Railway, Coolify, self-hosted with `npm run build && npm start`).

---

## License

This is a commercial product. See LICENSE file for terms.
