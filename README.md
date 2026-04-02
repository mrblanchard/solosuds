# SoapSuds

Practice management software for healthcare practitioners. SOAP notes, scheduling, billing, intake forms, and client messaging — in one place.

**Production:** https://soapsuds.app  
**Dev:** https://dev.soapsuds.app

---

## Features

- **SOAP Notes** — AI-powered clinical documentation with transcription, diagnosis/procedure codes, body charts, and reusable templates
- **Scheduling** — Calendar-based appointment management with email/SMS reminders
- **Client Management** — Patient records with demographics, tags, referral tracking, and emergency contacts
- **Billing** — Invoice generation with line items, CPT codes, tax, and Stripe payment processing
- **Intake Forms** — Custom form builder with shareable public links and submission tracking
- **Messaging** — Email-based client communication with read receipts
- **Multi-user** — Role-based access (Owner, Admin, Practitioner, Front Desk)
- **Dashboard** — Live stats for active clients, today's appointments, draft notes, and outstanding invoices

## Pricing

| Plan | Monthly | Yearly | Practitioners |
|------|---------|--------|---------------|
| Solo | $39 | $32/mo | 1 |
| Practice | $139 | $116/mo | Up to 5 |
| Clinic | $389 | $324/mo | Unlimited |

## Stack

- **Framework**: Next.js 16 (App Router, webpack)
- **Auth**: NextAuth v5 — Credentials + Google OAuth
- **Database**: PostgreSQL via Neon, Prisma ORM
- **Payments**: Stripe
- **Email**: Resend
- **SMS**: Twilio
- **AI**: OpenAI (transcription + SOAP generation)
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

