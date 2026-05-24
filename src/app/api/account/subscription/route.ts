import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// POST — cancel subscription at period end
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Only the account owner can manage billing" }, { status: 403 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeSubscriptionId: true, subscriptionStatus: true, createdAt: true },
  });

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  // Cancel at period end (not immediately)
  const sub = await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db.organization.update({
    where: { id: session.user.organizationId },
    data: { subscriptionStatus: "canceling" },
  });

  const expiresAt = new Date(((sub as unknown as { current_period_end: number }).current_period_end ?? 0) * 1000);

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}

// DELETE — reactivate a canceled subscription
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeSubscriptionId: true },
  });

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await db.organization.update({
    where: { id: session.user.organizationId },
    data: { subscriptionStatus: "active" },
  });

  return NextResponse.json({ ok: true });
}
