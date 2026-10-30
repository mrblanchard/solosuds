// Single source of truth for the product name and public domain. Changing
// APP_DOMAIN also means updating NEXTAUTH_URL, AUTH_URL, NEXT_PUBLIC_APP_URL
// and FROM_EMAIL in the Vercel project's environment variables.

export const APP_NAME = "Booked & Noted";

// Plain-ASCII form for places that can't take "&" or spaces: user agents,
// calendar PRODIDs, filenames.
export const APP_SLUG = "bookedandnoted";

export const APP_DOMAIN = "bookedandnoted.com";

// Vercel serves the www host and redirects the bare domain to it.
export const SITE_URL = `https://www.${APP_DOMAIN}`;

export const SUPPORT_EMAIL = `hello@${APP_DOMAIN}`;

export const NOREPLY_EMAIL = `noreply@${APP_DOMAIN}`;
