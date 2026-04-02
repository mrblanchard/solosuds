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

Code is hosted on [Forgejo](https://v14.next.forgejo.org/soapsuds/soapsuds). The production server is a Linode VPS running PM2 + cloudflared.

### Workflow

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
   npm install
   npm run build
   pm2 restart soapsuds
   ```

### First-time server setup

See the setup script in the deployment history. Server runs Node.js 22, PM2 process manager, and cloudflared for the `soapsuds.app` tunnel.

