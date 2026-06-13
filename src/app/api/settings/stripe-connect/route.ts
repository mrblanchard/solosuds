import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/** Creates (or resumes onboarding for) the org's Stripe Connect Express account. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeConnectAccountId: true },
  });

  let accountId = org?.stripeConnectAccountId;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: session.user.email ?? undefined,
        business_type: "individual",
        metadata: { organizationId: session.user.organizationId },
      });
      accountId = account.id;
      await db.organization.update({
        where: { id: session.user.organizationId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/settings?stripe_connect=refresh`,
      return_url: `${baseUrl}/dashboard/settings?stripe_connect=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[settings/stripe-connect POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Unlinks the org's Stripe Connect account from SoloSuds (does not delete the Stripe account itself). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.organization.update({
    where: { id: session.user.organizationId },
    data: {
      stripeConnectAccountId: null,
      stripeConnectChargesEnabled: false,
      stripeConnectDetailsSubmitted: false,
      stripeConnectPayoutsEnabled: false,
    },
  });

  return NextResponse.json({ ok: true });
}
