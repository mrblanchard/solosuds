// Single source of truth for the product name and public domain. To move to a
// new domain, change APP_DOMAIN here and update NEXTAUTH_URL, AUTH_URL,
// NEXT_PUBLIC_APP_URL and FROM_EMAIL in .env (see DOMAIN_SWITCH.md).

export const APP_NAME = "Booked & Noted";

// Plain-ASCII form for places that can't take "&" or spaces: user agents,
// calendar PRODIDs, filenames.
export const APP_SLUG = "bookedandnoted";

export const APP_DOMAIN = "solosuds.com";

export const SITE_URL = `https://${APP_DOMAIN}`;

// Already lives on the new domain, so it doesn't follow APP_DOMAIN.
export const SUPPORT_EMAIL = "hello@bookedandnoted.com";

export const NOREPLY_EMAIL = `noreply@${APP_DOMAIN}`;
