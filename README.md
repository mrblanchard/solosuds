# Booked & Noted

Practice management software for healthcare practitioners. SOAP notes, scheduling, billing, intake forms, and client messaging, all in one place.

**Production:** https://www.bookedandnoted.com

---

## Features

- **SOAP Notes** — AI-powered clinical documentation with transcription, diagnosis/procedure codes, body charts, and reusable templates
- **Scheduling** — Calendar-based appointment management with email/SMS reminders
- **Client Management** — Patient records with demographics, tags, referral tracking, emergency contacts, draggable detail sections, and a per-client document library
- **Billing** — Invoice generation with line items, CPT codes, tax, and Stripe payment processing
- **Intake Forms** — Custom form builder with shareable public links, email/SMS delivery, submission tracking, drag-to-reorder, and one-click duplication
- **Email Consent** — HIPAA-aware consent flow: auto-generates a consent form per practice, sends a branded email with a plain-English risk explanation, gates all email communication behind a signed consent. Supports NONE → PENDING → CONSENTED → REVOKED lifecycle. Consent submissions are permanently protected from deletion.
- **Client Document Portal** — Passwordless client-facing file portal at `/portal/[slug]`. Clients verify identity with a one-time code sent to their email or phone (no account required). Supports bidirectional document exchange (client uploads to practice; practice shares files with client). All files stored in Cloudflare R2 with AES-256 at-rest encryption and 15-minute expiring signed download URLs.
- **Messaging** — Conversational email threads with chat-style UI, inline reply, CKEditor 5 rich text editor, and inbound email receiving via Resend webhook
- **Search** — Global search modal (⌘K / Ctrl+K) across clients, notes, and appointments
- **Notifications** — In-app notification panel with unread badges
- **Multi-user** — Role-based access (Owner, Admin, Practitioner, Front Desk) with team invite links and email invitations
- **Dashboard** — Live stats, task manager, schedule, quick actions, recent notes, upcoming appointments, and messages. Widgets are drag-to-rearrange and resizable with visible resize handles (layout persisted per-user in localStorage)
- **Membership** — Stripe-integrated subscriptions with pause/cancel/resume, 30-day free trial, and trial-expired paywall
- **Legal** — Terms of Service and HIPAA compliance pages

## Pricing

Single tier for now — Solo, for individual practitioners. Multi-practitioner tiers (Practice, Clinic) may come later but aren't built or sold today.

| Plan | Monthly | Yearly |
|------|---------|--------|
| Solo | $39 | $31/mo ($372/yr) |

## Stack

- **Framework**: Next.js 16.2.2 (App Router, webpack)
- **Language**: TypeScript, React 19
- **Auth**: NextAuth v5 — Credentials + Google OAuth
- **Database**: PostgreSQL via Neon, Prisma 7.6
- **Payments**: Stripe (subscriptions, invoices, pause/resume)
- **Email**: Resend
- **SMS**: none yet (provider being replaced; texting shows as coming soon)
- **UI**: Tailwind CSS v4, FullCalendar 6, react-grid-layout 2, @dnd-kit (drag-and-drop), CKEditor 5 (GPL), Radix UI primitives
- **Forms**: React Hook Form + Zod 4 validation
- **Testing**: Vitest 4, Testing Library, happy-dom
- **Hosting**: Vercel (auto-deploys from GitHub `main`)

---

## Local Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

Copy `.env.example` to `.env` and fill in the required values (see below).

### Required env vars

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### Cloudflare R2 (file storage)

The client document portal, practice logo uploads and full account export use Cloudflare R2. The bucket name is set by `STORAGE_BUCKET`.

**Getting credentials:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage** (left sidebar)
2. Your **Account ID** appears in the URL: `dash.cloudflare.com/<account-id>/r2/...`
3. Click **Manage R2 API Tokens** (top right)
4. Click **Create API Token**, set permissions to **Object Read & Write**, and scope it to the app's bucket
5. Copy the credentials immediately, they are shown once

**Fill in `.env`:**
```
STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID="<token access key id>"
STORAGE_SECRET_ACCESS_KEY="<token secret access key>"
STORAGE_BUCKET="<bucket name>"
STORAGE_PUBLIC_URL=""   # leave blank, never expose the bucket publicly
```

> **Do not enable public bucket access.** Files are served through 15-minute expiring signed URLs generated server-side after authorization. A public bucket URL would bypass all access controls and violate HIPAA.

For production, set the same values in the Vercel project's Environment Variables and redeploy.

### Database

```bash
npx prisma migrate dev   # run migrations
npx prisma db seed       # seed initial data
npx prisma studio        # open DB browser
```

---

## Deploying to Production

Code lives on GitHub (`origin`). Production runs on Vercel, project `bookedandnoted`, serving `www.bookedandnoted.com` (the bare `bookedandnoted.com` redirects to it).

### Deploy workflow

1. Make changes locally and test on `http://localhost:3000`
2. Commit and push to `main`:
   ```bash
   git push origin main
   ```
3. Vercel builds and deploys automatically. Check with `npx vercel ls`.

Environment variables live in Vercel → Project → Settings → Environment Variables. After changing one, redeploy (`npx vercel redeploy <latest-production-url> --target production`), because `NEXT_PUBLIC_*` values are baked in at build time.

If `schema.prisma` changed, run `npx prisma db push` once locally (dev and prod share the same Neon database).

### Google OAuth redirect URIs

These must be in Google Console → OAuth client → Authorized redirect URIs:
- `http://localhost:3000/api/auth/callback/google`
- `https://www.bookedandnoted.com/api/auth/callback/google`

## Scalability Notes

The stack is designed to scale to 1,000+ users without architectural changes — just tier upgrades as needed.

### Neon (PostgreSQL)
Neon separates compute from storage. It auto-suspends when idle and scales compute up instantly under load. Connection pooling is already active via the `-pooler` suffix in `DATABASE_URL` (Neon's built-in PgBouncer). To scale: upgrade the compute size in the Neon console — no migration or data move required.

### Cloudflare R2 (file storage)
No egress fees. Built for petabyte-scale. 1,000 users uploading documents is trivial. No action needed to scale.

### Next.js / Vercel
Serverless functions scale automatically. Each API route spins up on demand — no server management required. The main latency concern at very high concurrency is cold starts, which only becomes noticeable at thousands of *simultaneous* requests.

### Service tier limits to watch

| Service | Free / default limit | When to upgrade |
|---|---|---|
| Neon | 0.5 GB storage, 1 compute unit | ~500+ active clients with lots of data |
| Resend | 3,000 emails/month | If clients actively use email features |
| Stripe | 0.5% + standard fees | Revenue-based, not user-count-based |
| Vercel | 100 GB bandwidth/month | High file download traffic |

No services require a painful migration to scale — upgrade tiers as revenue grows.

