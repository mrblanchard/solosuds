# SoapSuds

Practice management software for healthcare practitioners. SOAP notes, scheduling, billing, intake forms, and client messaging — in one place.

**Production:** https://soapsuds.app  
**Dev:** https://dev.soapsuds.app

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
- **Membership** — Stripe-integrated subscriptions with pause/cancel/resume, 14-day free trial, and trial-expired paywall
- **Legal** — Terms of Service and HIPAA compliance pages

## Pricing

| Plan | Monthly | Yearly | Practitioners |
|------|---------|--------|---------------|
| Solo | $39 | $32/mo | 1 |
| Practice | $139 | $116/mo | Up to 5 |
| Clinic | $389 | $324/mo | Unlimited |

## Stack

- **Framework**: Next.js 16.2.2 (App Router, webpack)
- **Language**: TypeScript, React 19
- **Auth**: NextAuth v5 — Credentials + Google OAuth
- **Database**: PostgreSQL via Neon, Prisma 7.6
- **Payments**: Stripe (subscriptions, invoices, pause/resume)
- **Email**: Resend
- **SMS**: Twilio
- **UI**: Tailwind CSS v4, FullCalendar 6, react-grid-layout 2, @dnd-kit (drag-and-drop), CKEditor 5 (GPL), Radix UI primitives
- **Forms**: React Hook Form + Zod 4 validation
- **Testing**: Vitest 4, Testing Library, happy-dom
- **Hosting**: Linode (Ubuntu 24.04, PM2, Cloudflare Tunnel)

---

## Local Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`. The Cloudflare tunnel at `dev.soapsuds.app` proxies to this port.

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

The client document portal requires Cloudflare R2. The bucket is already named `soapsuds` in the `.env`.

**Getting credentials:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage** (left sidebar)
2. Your **Account ID** appears in the URL: `dash.cloudflare.com/<account-id>/r2/...`
3. Click **Manage R2 API Tokens** (top right)
4. Click **Create API Token** — name it `soapsuds-app`, set permissions to **Object Read & Write**, scope it to the `soapsuds` bucket
5. Copy the credentials immediately — they are shown once

**Fill in `.env`:**
```
STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID="<token access key id>"
STORAGE_SECRET_ACCESS_KEY="<token secret access key>"
STORAGE_BUCKET="soapsuds"
STORAGE_PUBLIC_URL=""   # leave blank — never expose the bucket publicly
```

> **Do not enable public bucket access.** Files are served through 15-minute expiring signed URLs generated server-side after authorization. A public bucket URL would bypass all access controls and violate HIPAA.

**On the production server**, update `/app/soapsuds/.env` with the same values and restart: `pm2 restart soapsuds`

### Database

```bash
npx prisma migrate dev   # run migrations
npx prisma db seed       # seed initial data
npx prisma studio        # open DB browser
```

---

## Deploying to Production

Code is hosted on [Forgejo](https://v14.next.forgejo.org/soapsuds/soapsuds). The production server is a Linode VPS (Ubuntu 24.04, 1GB RAM, Newark NJ) running PM2 + cloudflared.

**Server IP:** `45.33.68.189`  
**Tunnel:** `soapsuds-prod` (ID: `96854119-0d6e-4303-a1b7-914706b14f52`) → `soapsuds.app`  
**Process manager:** PM2 (`pm2 list`, `pm2 logs soapsuds`)  
**Swap:** 2GB swapfile at `/swapfile` (needed for builds on 1GB RAM)

### Deploy workflow

1. Make changes locally and test on `dev.soapsuds.app`
2. Commit and push to Forgejo:
   ```bash
   git add .
   git commit -m "describe your change"
   git push
   ```
3. SSH into the server and deploy:
   ```bash
   ssh root@45.33.68.189
   cd /app/soapsuds
   git pull
   npm install        # only if package.json changed
   npx prisma generate  # only if schema.prisma changed
   npm run build
   pm2 restart soapsuds
   ```

### First-time server setup (already done)

- Node.js 22 via NodeSource
- PM2 with systemd startup (`pm2 startup systemd`)
- cloudflared as systemd service (`/etc/systemd/system/cloudflared.service`)
- 2GB swap at `/swapfile`
- App cloned to `/app/soapsuds`
- `.env` at `/app/soapsuds/.env` (not in git — must be set manually on server)

### Google OAuth redirect URIs

Both of these must be in Google Console → OAuth client → Authorized redirect URIs:
- `https://dev.soapsuds.app/api/auth/callback/google`
- `https://soapsuds.app/api/auth/callback/google`

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
| Twilio | Pay-as-you-go from day 1 | Already scales fine |
| Stripe | 0.5% + standard fees | Revenue-based, not user-count-based |
| Vercel | 100 GB bandwidth/month | High file download traffic |

No services require a painful migration to scale — upgrade tiers as revenue grows.

