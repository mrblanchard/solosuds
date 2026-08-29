import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
  // Deliberately pinned to this API version — the installed SDK's types only
  // accept its own latest literal, but bumping the actual apiVersion string
  // is a real behavior change to a payment-critical integration (different
  // response shapes/fields) that needs its own review, not a type-check
  // side effect. Stripe's own lib.d.ts recommends exactly this workaround
  // for staying on an older version: https://stripe.com/docs/api/versioning
  // @ts-expect-error — see comment above; remove once the API version is deliberately upgraded
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});
