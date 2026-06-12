# SoloSuds — Developer Notes

Internal reference for ongoing development decisions, fixes, and conventions. Not intended for end users.

---

## Architecture Overview

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # REST API endpoints (all server-side)
│   ├── dashboard/          # Authenticated dashboard pages
│   └── (public pages)      # login, register, book, intake, landing
├── components/
│   ├── layout/             # Sidebar, Topbar, DashboardShell, modals
│   ├── ui/                 # Generic design-system components (Button, Input, etc.)
│   └── (feature folders)   # billing/, booking/, clients/, notes/, etc.
├── lib/                    # Server utilities: auth.ts, db.ts, email.ts, stripe.ts, twilio.ts, utils.ts
├── test/                   # Vitest test files
│   ├── api/                # Schema / validation tests (no HTTP)
│   └── components/         # React component tests (happy-dom)
└── types/                  # next-auth.d.ts session type extensions
```

---

## Key Tech Notes

### Next.js
- Version **16.2.2** — App Router only; no Pages Router.
- Runs with `--webpack` flag (not Turbopack). Do not switch without testing.
- `"use client"` required in any component using hooks, event handlers, or browser APIs.

### Tailwind CSS v4
- No `tailwind.config.js` — configuration is CSS-based.
- Breakpoints follow standard Tailwind: `sm` (640px), `md` (768px), `lg` (1024px).
- Mobile-first: default styles target mobile, `sm:`/`md:`/`lg:` prefixes add larger-screen overrides.

### Zod v4
- File import: `import { z } from "zod"` — standard import works.
- Internal structure changed in v4. If you hit ESM errors, check `zod/v4/classic/external.js`.
- `.or()`, `.string()`, `.min()`, `.max()`, `.email()`, `.regex()` all work identically to v3.

### NextAuth v5 (beta)
- Config in `src/lib/auth.ts`.
- Session shape extended in `src/types/next-auth.d.ts` — adds `organizationId`, `role`, `subscriptionStatus`.
- Server components: `const session = await auth()`.
- Client components: `const { data: session } = useSession()`.

### Prisma 7.6
- Uses `@prisma/adapter-pg` (direct pg connection, not connection pooling by default).
- Schema: `prisma/schema.prisma`. Always run `npx prisma generate` after schema changes.
- Seed: `prisma/seed.ts` — run with `npx prisma db seed`.

### Twilio SMS
- Sender number: `+18886215253` (toll-free — requires toll-free verification before bulk SMS works).
- Set in `.env` as `TWILIO_PHONE_NUMBER`.
- The `TWILIO_ACCOUNT_SID` must be the account that owns `+18886215253`.

---

## Dashboard Layout System

The dashboard uses a three-layer layout:

```
DashboardLayout (server, src/app/dashboard/layout.tsx)
  └── DashboardShell (client, src/components/layout/dashboard-shell.tsx)
        ├── Sidebar (client, src/components/layout/sidebar.tsx)
        ├── Topbar (client, src/components/layout/topbar.tsx)
        └── <main>{children}</main>
```

`DashboardLayout` handles auth checks and redirects (server component).  
`DashboardShell` owns the `sidebarOpen` boolean state and passes it down.

### Mobile sidebar behavior
- **< lg (< 1024px):** Sidebar is `position: fixed`, slides in from the left with `translate-x-0` / `-translate-x-full`. A semi-transparent backdrop overlay renders behind it.
- **≥ lg (≥ 1024px):** Sidebar is `position: relative`, always visible. `lg:translate-x-0` overrides the mobile transforms.
- Hamburger button in Topbar (`lg:hidden`) triggers `setSidebarOpen(true)`.
- Close button inside Sidebar header (`lg:hidden`) and backdrop click both call `onClose`.

---

## Responsive Conventions

Use these patterns consistently throughout the app:

| Pattern | Use for |
|---------|---------|
| `hidden lg:flex` | Sidebar (always-on desktop) |
| `lg:hidden` | Mobile-only elements (hamburger, sidebar close button) |
| `hidden md:flex` | Desktop-only nav links (landing page) |
| `md:hidden` | Mobile-only elements on public pages |
| `grid-cols-1 sm:grid-cols-2` | Two-column form grids that stack on mobile |
| `p-4 sm:p-6` | Page-level padding |
| `overflow-x-auto` | Table wrappers — always wrap `<table>` in this |
| `min-h-[44px] min-w-[44px]` | Minimum touch target size for all icon buttons |
| `w-[min(24rem,calc(100vw-1rem))]` | Dropdown panels that must not overflow viewport |

### Touch targets
All icon-only buttons (hamburger, notifications bell, account avatar, close buttons) must have a minimum 44×44px touch target. Use `min-h-[44px] min-w-[44px]` with flexbox centering.

---

## Tables

Every `<table>` must be wrapped in `<div className="overflow-x-auto">` inside its container:

```tsx
<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      ...
    </table>
  </div>
</div>
```

Pages with tables: `dashboard/clients`, `dashboard/notes`, `dashboard/billing`, and the `new-invoice-form` line-items table.

---

## Messages Page (Mobile)

The messages page (`src/app/dashboard/messages/page.tsx`) uses a "master-detail" pattern:

- **No `clientId` in URL:** Shows the client list full-width. Thread panel is hidden on mobile (`hidden md:flex` on the thread div).
- **`clientId` present in URL:** Client list is hidden on mobile (`hidden md:flex` on the aside). Thread shows full-width with an `←` back button that links to `/dashboard/messages`.

This is entirely server-side via `searchParams` — no client state needed.

---

## Landing Page Nav

`src/components/landing-nav.tsx` is a `"use client"` component that manages the mobile hamburger state. It renders:
- Desktop: `hidden md:flex` anchor links + CTA buttons
- Mobile: hamburger button (`md:hidden`) + a conditionally rendered `data-testid="mobile-nav"` dropdown

The nav is embedded in the `<nav>` in `src/app/page.tsx` alongside the static logo.

---

## Testing

### Running tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with v8 coverage report
```

### Test environment

- **Vitest 4.x** with `globals: true` — do NOT `import { describe, it, expect, vi } from "vitest"` in test files; these are globals.
- **Node environment** (default) for API/schema tests.
- **happy-dom environment** for component tests — add `// @vitest-environment happy-dom` at the top of the file.
- **jest-dom** matchers loaded globally via `src/test/setup.ts`.

### Mocking conventions

```ts
// Next.js Link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a>,
}));

// Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// NextAuth
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: null }),
}));
```

### Test file locations

| File | What it tests |
|------|---------------|
| `src/test/utils.test.ts` | All utility functions in `src/lib/utils.ts` (48 tests) |
| `src/test/api/register.test.ts` | Registration payload validation (14 tests) |
| `src/test/api/clients.test.ts` | Client Zod schema (22 tests) |
| `src/test/api/invoices.test.ts` | Invoice schema + `calculateInvoice()` business logic (22 tests) |
| `src/test/components/sidebar.test.tsx` | Sidebar open/close state, backdrop, nav items (14 tests) |
| `src/test/components/topbar.test.tsx` | Hamburger button, search modal, keyboard shortcut (11 tests) |
| `src/test/components/dashboard-shell.test.tsx` | Sidebar toggle state, layout structure (8 tests) |
| `src/test/components/landing-nav.test.tsx` | Mobile menu open/close, desktop nav, touch targets (12 tests) |

**Total: 151 tests**

### Known vitest gotcha — `globals: true` + lucide-react
Lucide SVG icons render with `aria-hidden="true"` on the `<svg>` element. When querying for backdrop overlays (which are `<div aria-hidden="true">`), use `container.querySelector("div[aria-hidden='true']")` not `[aria-hidden='true']` to avoid false matches against SVG.

### Known vitest gotcha — `lg:translate-x-0`
The sidebar `<aside>` always contains `lg:translate-x-0` as a desktop override. When testing that the sidebar is NOT open, match against the bare class: `expect(className).not.toMatch(/(^|\s)translate-x-0(\s|$)/)` instead of `not.toContain("translate-x-0")`.

---

## Change History

### 2026-04-03

#### Twilio SMS fix
- **Problem:** SMS sending failed with "Mismatch between the 'From' number +18777804236 and the account".
- **Fix:** `+18777804236` was the recipient (Twilio Virtual Phone), not the sender number. Updated `.env`: `TWILIO_PHONE_NUMBER="+18886215253"`.
- **Note:** Toll-free number requires toll-free verification with Twilio before bulk sending works.

#### Date picker desktop positioning
- **Problem:** `DateWheelPicker` modal appeared at the bottom of the screen on desktop.
- **Fix:** `src/components/ui/date-wheel-picker.tsx` — added `sm:items-start sm:pt-[200px]` and `sm:rounded-2xl` so it positions near the top of the viewport on desktop while keeping the slide-up sheet behavior on mobile.

#### Test suite setup
- Installed: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `happy-dom`.
- Created `vitest.config.ts`, `src/test/setup.ts`.
- Added `test`, `test:watch`, `test:coverage` scripts to `package.json`.
- Initial suite: 106 tests across utility functions, API validation schemas, and invoice business logic.

#### Mobile / tablet responsive overhaul
All changes targeted mobile (< 768px) and tablet (< 1024px) usability.

**Critical — navigation:**
- `sidebar.tsx`: Now a slide-in drawer on mobile (`fixed`, `translate-x-*`). Accepts `open` and `onClose` props. Renders a semi-transparent backdrop and a close button when open. Desktop behavior (`lg:relative`, always visible) unchanged.
- `topbar.tsx`: Added `onMenuClick` prop and a hamburger `Menu` icon button (`lg:hidden`, 44px touch target).
- `dashboard-shell.tsx` (new): Client component that owns `sidebarOpen` state, wraps `<Sidebar>` and `<Topbar>`, and renders `<main className="p-4 sm:p-6">`.
- `dashboard/layout.tsx`: Simplified to render `<DashboardShell>` (removed direct `<Sidebar>` + `<Topbar>` usage).

**Critical — tables:**
- `dashboard/clients/page.tsx`, `dashboard/notes/page.tsx`, `dashboard/billing/page.tsx`, `components/billing/new-invoice-form.tsx`: Added `<div className="overflow-x-auto">` wrapper inside each table's border container.

**Critical — messages:**
- `dashboard/messages/page.tsx`: Master-detail layout. On mobile, only one panel is visible at a time. Client list hides when `clientId` is in the URL. Thread shows with a back-link `←` to `/dashboard/messages`. On `md:` and above, both panels show side-by-side.

**Usability — dropdowns:**
- `notifications-panel.tsx`: Panel width `w-96` → `w-[min(24rem,calc(100vw-1rem))]`. Bell touch target upgraded to `min-h-[44px] min-w-[44px]`.
- `account-menu.tsx`: Dropdown width `w-60` → `w-[min(15rem,calc(100vw-1rem))]`. Avatar `h-9 w-9` → `h-11 w-11`.

**Usability — form grids:**
- `components/booking/public-booking-form.tsx`: Date/time grid and first/last name grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.
- `components/notes/soap-note-editor.tsx`: Billing codes grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.

**Polish:**
- `dashboard/page.tsx`: Quick actions grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.
- `components/landing-nav.tsx` (new): Extracts nav links and CTA buttons into a `"use client"` component. Adds a hamburger menu (`md:hidden`) for mobile with a full-width dropdown.
- `app/page.tsx`: Uses `<LandingNav />` instead of inline nav links.

#### Mobile test suite (45 new tests)
- Added 4 new test files covering all mobile-specific components: `sidebar.test.tsx`, `topbar.test.tsx`, `dashboard-shell.test.tsx`, `landing-nav.test.tsx`.
- Total test count: **151**.

---

### 2026-04-04 (current session)

#### Dashboard widgets — react-grid-layout v2
- `src/components/dashboard/dashboard-widgets.tsx` (new): Client component implementing drag-to-rearrange / resize dashboard widgets using `react-grid-layout` v2.
- CSS import: `import "react-grid-layout/styles.css"` (v2 ships only `styles.css`; not `css/styles.css`).
- Drag handle: set `draggableHandle=".rgl-drag-handle"` on `<ResponsiveGridLayout>` and add `className="rgl-drag-handle"` to the widget header element to restrict dragging to the header bar.
- Layouts: typed as `Layouts` (from `react-grid-layout`). `ResponsiveLayouts` is **not** a named export — use `Layouts`.
- Breakpoints: `{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }`. Layout persisted to `localStorage` under the key `"dashboard-layouts"`.

#### Search and sort on list pages
- `src/components/ui/table-search.tsx` (new): Debounced search input that writes to `?q=` URL param. Uses `useSearchParams` + `useRouter`.
- `src/components/ui/sort-header.tsx` (new): `<th>` component with click-to-sort asc/desc. Writes `?sort=field&dir=asc|desc` to URL params.
- Added to `dashboard/notes/page.tsx`, `dashboard/billing/page.tsx`, `dashboard/clients/page.tsx`.

#### Form accessibility fixes

All forms now comply with WCAG label requirements:

**Standards enforced:**
1. Every `<Label>` must have `htmlFor` matching the `id` of its associated input/select/textarea.
2. Every `<form>` must have an `onSubmit` handler so Enter-key submission works (no submit-by-onClick only).
3. Table-cell inputs (no visible label) must have `aria-label`.
4. Icon-only buttons must have `aria-label`.
5. Controlled inputs must have a `name` attribute.

**Files changed:**

| File | Changes |
|------|---------|
| `src/components/ui/date-wheel-picker.tsx` | Added optional `id` prop; passed to trigger `<button>` |
| `src/components/clients/client-form.tsx` | `FormField` helper now accepts `fieldId`; all `<Label>` have `htmlFor`; all inputs have `id`; controlled `phone`/`zip`/`emergencyPhone` inputs have `name`; `internalNotes` textarea now has visible label |
| `src/components/schedule/appointment-form.tsx` | Added `id` to all 6 fields (client, practitioner, service selects; start/end time inputs; notes textarea) |
| `src/components/notes/new-note-form.tsx` | Added `id` to client select, template select, and `DateWheelPicker` |
| `src/components/notes/soap-note-editor.tsx` | SOAP textareas get `id={key}` + `aria-label={label}`; diagnosis/procedure `<Label>` have `htmlFor` + inputs have `id` |
| `src/components/settings/org-settings.tsx` | Fields in `.map()` get `htmlFor={f.key}` on `<Label>` and `id={f.key}` on inputs; wrapped in `<form onSubmit>` |
| `src/components/settings/profile-settings.tsx` | All 4 fields get `htmlFor`/`id`; wrapped in `<form onSubmit>` |
| `src/components/booking/public-booking-form.tsx` | Step 2 wrapped in `<form onSubmit>`; all 7 fields get `htmlFor`/`id` |
| `src/components/intake/public-intake-form.tsx` | Dynamic fields: `<Label htmlFor={field.id}>`; all inputs/textareas/selects get `id={field.id}` |
| `src/components/messages/message-composer.tsx` | `<Textarea>` gets `aria-label="Message"` |
| `src/components/billing/new-invoice-form.tsx` | Line-item table inputs get `aria-label="Row N description/CPT/quantity/unit price"`; remove button gets `aria-label="Remove item N"`; tax field gets `<Label htmlFor="tax">` and `id="tax"` |
| `src/app/register/page.tsx` | `organizationName` and `name` inputs get explicit `type="text"` |

#### New form component tests (54 tests)
Added 4 new test files in `src/test/components/`:

| File | Coverage |
|------|---------|
| `appointment-form.test.tsx` | Renders labels, label/id associations, validation errors, service auto end-time, update mode |
| `new-note-form.test.tsx` | Renders fields, label/id associations, client required validation, duplicate banner |
| `public-booking-form.test.tsx` | Service selection step, step 2 form element, field labels, htmlFor/id pairs, validation, back navigation |
| `new-invoice-form.test.tsx` | Accessibility aria-labels, add/remove line items, totals display, client required validation, defaultClientId |

**Updated test count table:**

| File | What it tests | Tests |
|------|---------------|-------|
| `src/test/utils.test.ts` | All utility functions in `src/lib/utils.ts` | 48 |
| `src/test/api/register.test.ts` | Registration payload validation | 14 |
| `src/test/api/clients.test.ts` | Client Zod schema | 22 |
| `src/test/api/invoices.test.ts` | Invoice schema + `calculateInvoice()` | 22 |
| `src/test/components/sidebar.test.tsx` | Sidebar open/close, backdrop, nav | 14 |
| `src/test/components/topbar.test.tsx` | Hamburger, search modal, keyboard shortcut | 11 |
| `src/test/components/dashboard-shell.test.tsx` | Sidebar toggle, layout structure | 8 |
| `src/test/components/landing-nav.test.tsx` | Mobile menu, desktop nav, touch targets | 12 |
| `src/test/components/appointment-form.test.tsx` | Field rendering, labels, validation, auto end-time | 16 |
| `src/test/components/new-note-form.test.tsx` | Field rendering, labels, validation | 8 |
| `src/test/components/public-booking-form.test.tsx` | Step flow, form element, label/id, validation | 10 |
| `src/test/components/new-invoice-form.test.tsx` | aria-labels, add/remove items, totals, validation | 20 |

**Total: 205 tests**

#### FullCalendar visual polish
- Event backgrounds: Added `!important` CSS overrides on `.fc-event`, `.fc-timegrid-event`, `.fc-daygrid-event` because FullCalendar sets inline `backgroundColor` per-event.
- Today column: `.fc-day-today` changed from default yellow to `--color-indigo-50`.
- Non-business hours: `.fc-non-business` uses semi-transparent `rgba(245, 242, 251, 0.7)` so grid lines show through.
- Grid lines: Border colors set to `--color-indigo-300` on `td`, `th`, `.fc-scrollgrid`, `.fc-timegrid-slot`.
- Toolbar buttons: Purple theme (`--color-indigo-600` / `--color-indigo-700`).
- `STATUS_COLORS` in schedule page updated to deeper shades (e.g. SCHEDULED `#5a4f8a`).

#### Clients table responsive padding
- All table cells changed from `px-6` to `px-2 xl:px-6` (headers + body) for iPad Pro 1366×1024.
- Actions cell: added `whitespace-nowrap` to prevent button wrapping.
- `sort-header.tsx` updated to match (`px-2 xl:px-6`).

#### Saved toast indicator
- `src/components/ui/saved-toast.tsx` (new): Transient toast at top-center. 2-second auto-dismiss with `animate-fade-in`.
- Added `@keyframes fade-in` to `globals.css`.
- Integrated into `intake-form-grid.tsx` ("Order saved") and `dashboard-widgets.tsx` ("Layout saved").

#### Drag handle standardization
All 4 drag implementations now use consistent handles:
- `GripVertical` icon from lucide-react (dashboard-widgets switched from custom 6-dot SVG).
- `select-none`, `aria-label="Drag to reorder"` on all handles.
- Drag state: `opacity: 0.4`, `ring-2 ring-indigo-200`, `border-indigo-300`.

#### Sidebar branding
- Added "Soap Suds" text next to logo in sidebar header. Hidden when sidebar is collapsed.

#### Bug fixes
- **Messages page**: `searchParams` is a `Promise` in Next.js 16 — added `await` before destructuring.
- **Service creation**: Zod `createSchema` had `.optional()` but form sends `null` — added `.nullable()`.
- **Profile settings**: Moved `space-y-4` from `CardContent` to `<form>`. "Change password" changed to `<h3>`.
- **Delete form modal**: Modal stayed open after success — added `setShowConfirm(false)` before `router.push`.
- **Copy link button**: `navigator.clipboard.writeText()` fails silently on HTTP — added try/catch with `document.execCommand("copy")` fallback.

#### Membership management
- `POST /api/account/subscription` — cancel at period end.
- `DELETE /api/account/subscription` — reactivate canceled subscription.
- `PATCH /api/account/subscription` — pause via Stripe `pause_collection`.
- `PUT /api/account/subscription` — resume from pause.
- Account page: pause/resume UI, trial days remaining calculation, status map includes "paused".
- `src/app/trial-expired/page.tsx` (new): Paywall page for expired/canceled/paused accounts with `PricingSection`.
- Dashboard layout: checks org `createdAt` + subscription status; redirects expired trials (14 days), canceled, and paused accounts to `/trial-expired`.

#### Terms & HIPAA pages
- `src/app/terms/page.tsx` and `src/app/hipaa/page.tsx`: Session-aware — logged-in shows "Back to dashboard", logged-out shows "Back" to registration.

#### Intake form duplication
- `POST /api/intake-forms/[id]/duplicate` (new): Clones form with "(Copy)" suffix, sets `isActive: false`, 0 submissions.
- `src/components/intake/duplicate-form-button.tsx` (new): Replaces clipboard "Copy" button on grid cards.
- Grid "Copy" now duplicates the form and appends it to the grid. The original `CopyLinkButton` remains on the individual form edit page.

#### Footer cleanup
- Removed phone number from `app-footer.tsx`, keeping only the support email.

---

### 2026-04-04 – 2026-04-05

#### Team invite link with email invitations
- `POST /api/settings/organization/invite` — generates a unique invite token stored on the Organization model.
- `POST /api/settings/organization/invite-email` — sends invite email via Resend with a registration link containing the token.
- `GET /api/auth/invite-info?token=...` — returns org name for the invite token (used by register page).
- `src/app/register/page.tsx` — detects `?invite=` param, auto-fills org name, links new user to the existing organization on registration.
- `src/components/settings/org-settings.tsx` — "Team" tab with generate/copy invite link and send invite email form.

#### Email client system
- `src/app/api/emails/route.ts` — `GET` (list) and `POST` (send via Resend) endpoints.
- `src/app/api/emails/[id]/route.ts` — `GET` single email and `DELETE`.
- Email model in Prisma schema with `direction` (OUTBOUND/INBOUND), `fromEmail`, `textBody`, `read` fields; `senderId` is optional for inbound.
- `src/lib/permissions.ts` (new) — `requireOwnerOrAdmin()` helper for role-based access checks.

#### DELETE permission enforcement
Added PRACTITIONER/FRONT_DESK role blocking to all DELETE routes:
- `src/app/api/clients/[id]/route.ts`
- `src/app/api/notes/[id]/route.ts`
- `src/app/api/appointments/[id]/route.ts`
- `src/app/api/intake-forms/[id]/route.ts`
- `src/app/api/notes/templates/[id]/route.ts`
- `src/app/api/tasks/[id]/route.ts`

#### CKEditor 5 swap (from TinyMCE)
- Replaced `@tinymce/tinymce-react` + `tinymce` with `@ckeditor/ckeditor5-react` + `ckeditor5` (GPL license, no API key required).
- `src/components/email/ckeditor-wrapper.tsx` (new): Standalone CKEditor 5 ClassicEditor wrapper with `licenseKey: "GPL"`. Plugins: Essentials, Bold, Italic, Underline, Strikethrough, Heading, Alignment, Link, List, Indent, BlockQuote, Table, MediaEmbed, Font, Paragraph.
- `src/components/email/compose-email.tsx` — loads CKEditor via `dynamic(() => import("./ckeditor-wrapper"), { ssr: false })` to avoid SSR `window`/`document` errors.

#### Inbound email via Resend webhook
- `src/app/api/webhooks/resend/route.ts` (new): Handles `email.received` webhook events. Fetches full email via `resend.emails.receiving.get()`, matches sender to client by email (case-insensitive), stores as INBOUND email with `read: false`.
- Requires Resend MX record on `solosuds.com` domain for inbound routing.

#### Conversational email threads
- `src/components/email/conversation-list.tsx` (new): Conversations grouped by client with initials avatar, unread count badge (indigo), last message preview.
- `src/components/email/email-thread.tsx` (new): Chat-style thread view — outbound messages as indigo bubbles (right-aligned), inbound as gray bubbles (left-aligned). Each bubble shows subject, HTML body, attachments, and timestamp.
- Inline reply at bottom of thread with CKEditor, subject auto-prefilled with "Re: ...".
- Auto-marks inbound emails as read when opening thread (`updateMany`).
- `src/app/dashboard/email/page.tsx` — rewritten to query conversations grouped by client with unread counts.
- `src/app/dashboard/email/[id]/page.tsx` — `[id]` is now `clientId`; shows full email thread.

#### Dashboard grid layout update
- Content sections resized to `w:4, h:6` on lg (3 compact cards per row), `w:4, h:6` on md (2 per row), full-width on sm/xs.
- Always-visible `Maximize2` resize icon in bottom-right of every grid card.
- CSS: react-grid-layout resize handle enlarged to 24×24px with 3px border in indigo-400.
- Storage key bumped from `v2` to `v3` to force layout reset for all users.

---

### 2026-06-12 — Security audit fixes

Full pass across auth/RBAC, file storage, webhooks, and stored-XSS surfaces. 12 findings fixed, highest severity first.

#### Cross-tenant data isolation
- `src/app/api/intake-forms/[id]/submit/route.ts` — the consent `client.updateMany` was scoped only by `clientId`, so a malicious submission could flip `emailConsentStatus` on a client in a *different* org if the attacker knew/guessed its ID. Now also selects `organizationId` from the form and scopes the update by it.
  - **Check:** submit an intake form; confirm only the client belonging to that form's org gets `emailConsentStatus: CONSENTED`.
- `src/app/api/invoices/[id]/route.ts` — `GET` included a non-existent `soapNote` relation on `Invoice` (Prisma has no such field), so this endpoint threw on every call. Removed from the `include`.
  - **Check:** `GET /api/invoices/:id` now returns 200 with `client` and `appointment`.

#### Portal OTP hardening
- `src/lib/rate-limit.ts` (new) — in-memory sliding-window limiter: `checkRateLimit(key, max, windowMs)`, `getClientIp(request)`.
- `src/app/api/portal/verify/route.ts` — 5 attempts/15min per account + 20/15min per IP → `429` before the OTP is checked.
- `src/app/api/portal/request-access/route.ts` — 3 requests/15min per account + 20/15min per IP → `429`; OTP now generated with `crypto.randomInt(100000, 1000000)` instead of `Math.random()` (was guessable/biased).
  - **Check:** request portal access 4x quickly for one client → 4th call returns 429 with "Too many requests...". Same pattern for `/verify` after 5 wrong codes.
  - **Caveat:** rate-limit state is in-memory per process — resets on every deploy/restart, and won't be shared if the app ever runs as a PM2 cluster (currently single instance, so fine).

#### Webhook signature verification
- `src/app/api/webhooks/resend/route.ts` — verifies the Svix signature (`svix-id`/`svix-timestamp`/`svix-signature`) via `new Webhook(RESEND_WEBHOOK_SECRET).verify()`. **Fails closed**: `500` if `RESEND_WEBHOOK_SECRET` is unset, `401` on bad signature, `400` on unparseable payload.
- `src/lib/twilio.ts` — new `isValidTwilioRequest(request, params)` wrapping `Twilio.validateRequest`.
- `src/app/api/webhooks/twilio/route.ts` and `src/app/api/twilio/status/route.ts` — both verify `x-twilio-signature` and return `403` before processing.
  - **Check:** `curl -X POST https://solosuds.com/api/webhooks/resend` with no Svix headers → `401`/`500`. Same idea for the Twilio routes with no `x-twilio-signature` → `403`.
  - **Note:** Twilio creds are still commented out in `.env` ("coming soon"), so both Twilio routes will `403` everything until `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` are set — expected, not a regression.

#### Stored XSS prevention
- `src/lib/sanitize.ts` (new) — `sanitizeEmailHtml()` via `sanitize-html`, allow-listing formatting tags/attributes only; strips `<script>`, `<style>`, `<iframe>`, event handlers, `javascript:` URLs.
- `src/app/api/webhooks/resend/route.ts` — inbound email `htmlBody` is sanitized before it's persisted to `Email.htmlBody`.
- `src/app/api/settings/organization/route.ts` — `emailSignature` sanitized on save.
- `src/lib/email.ts` — new `escapeHtml()`; applied to `orgName` and `logoUrl` inside `buildBrandedEmail()` so an org's display name/logo URL can't break out of the HTML email template.
  - **Check:** set the org name to `"><img src=x onerror=alert(1)>` in Settings, trigger any branded email (e.g. appointment reminder), confirm the name renders as literal escaped text in the email source.
  - **Outstanding — needs your call:** rows written to `Email.htmlBody` / `Organization.emailSignature` *before* this fix were not retroactively re-sanitized. A backfill script could clean existing data, but that's a separate prod-DB write — only do it if asked.

#### File upload validation
- `src/lib/file-validation.ts` (new) — `validateUploadedFile(file)` checks MIME type against an allow-list (`pdf`, `jpg/jpeg`, `png`, `gif`, `webp`, `heic`, `doc`, `docx`, `xls`, `xlsx`, `txt`, `csv`) and cross-checks the file extension matches, returning a safe lowercase extension or `null`.
- `src/app/api/clients/[id]/documents/route.ts` and `src/app/api/portal/documents/route.ts` — reject (`400 "Unsupported file type"`) anything outside the allow-list instead of trusting the client-supplied extension for the storage key.
  - **Check:** try uploading a `.exe`/`.html`/etc. via both the dashboard client-documents uploader and the client portal uploader → `400`.

#### Org invite code expiry
- `prisma/schema.prisma` — added `Organization.inviteCodeExpiresAt DateTime?`.
- `src/lib/utils.ts` — `INVITE_CODE_TTL_MS` (7 days).
- `src/app/api/settings/organization/invite/route.ts` — (re)generating the team invite link sets a fresh 7-day expiry.
- `src/app/api/auth/register/route.ts` (both the join-existing-org path and new-org creation) and `src/app/api/auth/invite-info/route.ts` — reject expired codes as "Invalid or expired invite link" / `404`.
- **DB sync done 2026-06-12**: ran `npx prisma generate` + `npx prisma db push` against the prod Neon DB — schema is in sync (this also picked up other previously-drifted columns like `brandFont`, `emailSignature`, `faviconUrl`, `replyToEmail`).
  - **Check:** generate a team invite link, then in the DB set that org's `inviteCodeExpiresAt` to a past date — `/register?invite=<code>` should now show "Invalid invite code" and registering with it returns "Invalid or expired invite link".

#### Seed script guard
- `prisma/seed.ts` — refuses to run when `NODE_ENV=production` (the seed `upsert`s a hardcoded `admin@SoloSuds.dev` / `Admin1234!` account — running it against prod would create/reset that login). Also exits non-zero on error instead of silently logging via `console.error` only.
  - **Check:** `NODE_ENV=production npx tsx prisma/seed.ts` should throw and exit 1 immediately.

#### New dependencies / config
- `package.json` — added `sanitize-html`, `svix`, `@types/sanitize-html`.
- `.env` — added `RESEND_WEBHOOK_SECRET` (from Resend dashboard → Webhooks → endpoint signing secret). **Set in both local `.env` and prod `/app/solosuds/.env`** as of 2026-06-12. Without it, `/api/webhooks/resend` returns `500` for every request.

#### Deploy checklist for this batch
1. `git push`, then on the server: `cd /app/solosuds && git pull`.
2. `npm install` (new deps: sanitize-html, svix).
3. `npx prisma generate` (schema changed; DB itself is already synced as of 2026-06-12 — this just regenerates types).
4. `npm run build && pm2 restart solosuds`.
5. `RESEND_WEBHOOK_SECRET` is already in prod `.env` — no action needed.

