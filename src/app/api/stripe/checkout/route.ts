import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planKey, interval } = (await req.json()) as {
    planKey: string;
    interval: "monthly" | "annual";
  };

  // Read price IDs at request time so env changes take effect after restart
  const PLAN_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
    solo: {
      monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY ?? "",
      annual: process.env.STRIPE_PRICE_SOLO_ANNUAL ?? "",
    },
  };

  const priceIds = PLAN_PRICE_IDS[planKey];
  if (!priceIds) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = interval === "annual" ? priceIds.annual : priceIds.monthly;
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for ${planKey}/${interval}. Add STRIPE_PRICE_* to .env and restart the server.` },
      { status: 500 }
    );
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeCustomerId: true, name: true },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const promoCoupon = process.env.STRIPE_COUPON_LAUNCH_PROMO;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(org?.stripeCustomerId
        ? { customer: org.stripeCustomerId }
        : { customer_email: session.user.email ?? undefined }),
      ...(promoCoupon
        ? { discounts: [{ promotion_code: promoCoupon }] }
        : {}),
      subscription_data: {
        metadata: { organizationId: session.user.organizationId, plan: planKey },
      },
      success_url: `${baseUrl}/dashboard?subscribed=1`,
      cancel_url: `${baseUrl}/trial-expired`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
