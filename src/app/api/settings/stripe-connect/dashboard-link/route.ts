import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/** Generates a one-time login link to the org's Stripe Express Dashboard. */
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

  if (!org?.stripeConnectAccountId) {
    return NextResponse.json({ error: "Stripe account not connected" }, { status: 404 });
  }

  try {
    const link = await stripe.accounts.createLoginLink(org.stripeConnectAccountId);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[settings/stripe-connect/dashboard-link]", message);
    return NextResponse.json({ error: "Unable to open Stripe dashboard, finish onboarding first." }, { status: 400 });
  }
}
