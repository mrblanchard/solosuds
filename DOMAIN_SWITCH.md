# Switching from solosuds.com to bookedandnoted.com

The app is already renamed to Booked & Noted and is hosted on Vercel
(project `solosuds`; every push to `main` on GitHub deploys it). Only the
domain is left. Steps 1 to 5 can all happen before cutover day, because they
only add the new domain next to the old one.

## 1. Add the domain in Vercel
- In Vercel, open Project `solosuds`, go to Settings > Domains, and add
  `bookedandnoted.com` and `www.bookedandnoted.com`.
- Create the DNS records Vercel shows wherever bookedandnoted.com's DNS is
  hosted. Keep the existing MX records: they deliver mail to
  `hello@bookedandnoted.com`, which the site already uses as its contact
  address.
- Keep `solosuds.com` attached to the project. See step 8 for why.

## 2. Email sending (Resend)
- Add `bookedandnoted.com` as a sending domain in Resend and add its SPF and
  DKIM records. Wait until it shows Verified.
- If inbound email through Resend is still in use, add its MX record (it can
  sit alongside the hello@ mail setup only if it is on a subdomain, so check
  before adding) and update the inbound webhook URL.

## 3. Stripe
- Platform webhook: add a new endpoint
  `https://bookedandnoted.com/api/webhooks/stripe`. It gets a new signing
  secret, which goes in `STRIPE_WEBHOOK_SECRET`.
- Connect webhook: add `https://bookedandnoted.com/api/webhooks/stripe-connect`
  with "Listen to events on Connected accounts". Its new secret goes in
  `STRIPE_CONNECT_WEBHOOK_SECRET`.
- Delete the old solosuds.com endpoints only after the new ones show
  successful deliveries.
- Update the business name, website, support email and statement descriptor
  under Settings > Business and Connect > Branding. These show the brand
  name, so you can change them now.

## 4. Google OAuth
In Google Cloud Console, add `https://bookedandnoted.com` (and the www form
if you use it) to the authorized JavaScript origins and
`https://bookedandnoted.com/api/auth/callback/google` to the redirect URIs.
Leave the old ones until cutover is done.

## 5. Turnstile
Add `bookedandnoted.com` to the allowed hostnames on the Turnstile widget,
or login breaks.

## R2 (nothing to do)
The bucket is reached through the account endpoint
(`*.r2.cloudflarestorage.com`) with short-lived signed URLs, so it is not
tied to any domain. The bucket name `solosuds` is internal and nobody sees
it, so renaming it isn't worth migrating every stored file.

## 6. Code change (one commit)
- `src/lib/brand.ts`: set `APP_DOMAIN = "bookedandnoted.com"`.
- `next.config.ts`: update `allowedDevOrigins` if you use a dev hostname.
- Add the old-domain redirect from step 8 to `next.config.ts`.

## 7. Vercel env vars, then deploy
In Vercel, open Settings > Environment Variables and set these for
Production:
```
NEXTAUTH_URL=https://bookedandnoted.com
AUTH_URL=https://bookedandnoted.com
NEXT_PUBLIC_APP_URL=https://bookedandnoted.com
FROM_EMAIL=noreply@bookedandnoted.com
STRIPE_WEBHOOK_SECRET=<new secret from step 3>
STRIPE_CONNECT_WEBHOOK_SECRET=<new secret from step 3>
```
Then push the step 6 commit. That push deploys with the new values. If you
change env vars without pushing, redeploy the latest production deployment,
because `NEXT_PUBLIC_APP_URL` is baked in at build time.

Everyone gets logged out once, because login cookies belong to a single
domain.

## 8. Keep solosuds.com working
Old links are already out there: booking and intake links in sent emails,
links practitioners put on their own sites, and the embed snippet
`<script src="https://solosuds.com/embed.js">`. The embed sends its API calls
to whatever domain served the script. Those calls are cross-origin POSTs, and
a redirect would break them.

So solosuds.com stays attached to the Vercel project, and every other request
gets redirected. Don't use Vercel's "Redirect to another domain" option on the
domain, because it would redirect the API calls too. Use a redirect in
`next.config.ts` instead:

```ts
async redirects() {
  return [
    {
      source: "/:path((?!api/|embed\\.js$).*)",
      has: [{ type: "host", value: "(www\\.)?solosuds\\.com" }],
      destination: "https://bookedandnoted.com/:path",
      permanent: true,
    },
  ];
},
```

Keep solosuds.com registered and renewed for at least a year.

## 9. After cutover
- Smoke test: the homepage, a `/book/<slug>` page, login, an old-domain link
  (should redirect), and an old embed snippet on a test page (should still book).
- In Google Search Console, add the new property and file a Change of Address
  from solosuds.com.
