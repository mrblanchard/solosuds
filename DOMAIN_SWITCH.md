# Switching from solosuds.com to bookedandnoted.com

The app is already renamed to Booked & Noted. Only the domain is left. Do the
steps below in order. Steps 1 to 6 can all happen before cutover day, because
they only add the new domain next to the old one.

## 1. DNS and tunnel (Cloudflare)
- Add `bookedandnoted.com` as a zone in Cloudflare and point the registrar's
  nameservers at it.
- On the `SoloSuds-prod` tunnel, add public hostnames `bookedandnoted.com` and
  `www.bookedandnoted.com` that point at the same local service as
  `solosuds.com`. Do the same for the dev hostname if you want one.
- Keep the `solosuds.com` hostname on the tunnel. See step 9 for why.

## 2. Email (Resend + inbox)
- Add `bookedandnoted.com` as a sending domain in Resend and add its SPF and
  DKIM records. Wait until it shows Verified.
- If inbound email is still in use (readme-developer.md, Resend MX), add the
  MX record on the new domain and update the inbound webhook URL.
- The contact inbox `hello@bookedandnoted.com` is already live and already
  used everywhere on the site. If you move DNS to Cloudflare, re-create its
  MX records there before changing nameservers, or the inbox stops receiving
  mail.

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
In Google Cloud Console, add `https://bookedandnoted.com` to the authorized
JavaScript origins and `https://bookedandnoted.com/api/auth/callback/google` to
the redirect URIs. Leave the old ones until cutover is done.

## 5. Turnstile
Add `bookedandnoted.com` to the allowed hostnames on the Turnstile widget,
or login breaks.

## 6. R2
Nothing to do. The bucket is reached through the account endpoint
(`*.r2.cloudflarestorage.com`) with short-lived signed URLs, so it is not
tied to any domain. The bucket name `solosuds` is internal and nobody sees
it, so renaming it isn't worth migrating every stored file.

## 7. Code change (one commit)
- `src/lib/brand.ts`: set `APP_DOMAIN = "bookedandnoted.com"`.
- `next.config.ts`: update `allowedDevOrigins` to the new dev hostname.

## 8. Server .env, rebuild, restart
On the server, set:
```
NEXTAUTH_URL="https://bookedandnoted.com"
AUTH_URL="https://bookedandnoted.com"
NEXT_PUBLIC_APP_URL="https://bookedandnoted.com"
FROM_EMAIL="noreply@bookedandnoted.com"
FROM_NAME="Booked & Noted"
STRIPE_WEBHOOK_SECRET=<new secret from step 3>
STRIPE_CONNECT_WEBHOOK_SECRET=<new secret from step 3>
```
Then `git pull`, `npm run build` (required, because `NEXT_PUBLIC_APP_URL` is
baked in at build time), and `pm2 restart solosuds --update-env`.

Everyone gets logged out once, because login cookies belong to a single
domain.

## 9. Keep solosuds.com working
Old links are already out there: booking and intake links in sent emails,
links practitioners put on their own sites, and the embed snippet
`<script src="https://solosuds.com/embed.js">`. The embed sends its API calls
to whatever domain served the script. Those calls are cross-origin POSTs, and
a redirect would break them.

So the tunnel keeps routing solosuds.com to the app, and you add one Cloudflare
Redirect Rule on the solosuds.com zone:
- When the hostname is `solosuds.com` and the path does not start with `/api/`
  and is not `/embed.js`, do a 301 to `https://bookedandnoted.com${path}` and
  keep the query string.

Keep solosuds.com registered and renewed for at least a year.

## 10. After cutover
- Smoke test: the homepage, a `/book/<slug>` page, login, an old-domain link
  (should redirect), and an old embed snippet on a test page (should still book).
- In Google Search Console, add the new property and file a Change of Address
  from solosuds.com.
