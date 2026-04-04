import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

async function requireOwnerOrAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Only the account owner can manage billing" }, { status: 403 }) };
  }
  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeSubscriptionId: true, subscriptionStatus: true },
  });
  return { session, org };
}

// POST — cancel subscription at period end
export async function POST() {
  const result = await requireOwnerOrAdmin();
  if ("error" in result && result.error) return result.error;
  const { session, org } = result;

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  const sub = await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: { subscriptionStatus: "canceling" },
  });

  const subData = sub as unknown as { current_period_end: number };
  const expiresAt = new Date((subData.current_period_end ?? 0) * 1000);

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}

// DELETE — reactivate a canceled subscription
export async function DELETE() {
  const result = await requireOwnerOrAdmin();
  if ("error" in result && result.error) return result.error;
  const { session, org } = result;

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: { subscriptionStatus: "active" },
  });

  return NextResponse.json({ ok: true });
}

// PATCH — pause subscription
export async function PATCH() {
  const result = await requireOwnerOrAdmin();
  if ("error" in result && result.error) return result.error;
  const { session, org } = result;

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  if (org.subscriptionStatus === "paused") {
    return NextResponse.json({ error: "Subscription is already paused" }, { status: 400 });
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    pause_collection: { behavior: "void" },
  });

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: { subscriptionStatus: "paused" },
  });

  return NextResponse.json({ ok: true });
}

// PUT — resume a paused subscription
export async function PUT() {
  const result = await requireOwnerOrAdmin();
  if ("error" in result && result.error) return result.error;
  const { session, org } = result;

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    pause_collection: "",
  });

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: { subscriptionStatus: "active" },
  });

  return NextResponse.json({ ok: true });
}
