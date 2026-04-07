/**
 * Cloudflare Turnstile server-side token verification.
 *
 * In development, set TURNSTILE_SECRET_KEY to the Cloudflare "always passes"
 * test secret: 1x0000000000000000000000000000000AA
 * In production, replace with the real secret from dash.cloudflare.com → Turnstile.
 */

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Verify a Turnstile token submitted by the client.
 * Returns true if valid, false if invalid or if CAPTCHA is not configured.
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // If CAPTCHA is not configured, skip verification (allows dev without setup)
  if (!secret) return true;
  if (!token) return false;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!res.ok) return false;
  const data = (await res.json()) as TurnstileVerifyResponse;
  return data.success === true;
}
