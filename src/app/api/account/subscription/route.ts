import { NextRequest, NextResponse } from "next/server";
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

// POST — cancel at end of current billing period (access until then)
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

  const expiresAt = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: { subscriptionStatus: "canceling", subscriptionPeriodEnd: expiresAt },
  });

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}

// DELETE — reactivate a canceling subscription (undo cancel)
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
    data: { subscriptionStatus: "active", subscriptionPeriodEnd: null },
  });

  return NextResponse.json({ ok: true });
}

// PATCH — pause: immediately blocks access, stops billing for chosen duration (1–12 months)
export async function PATCH(req: NextRequest) {
  const result = await requireOwnerOrAdmin();
  if ("error" in result && result.error) return result.error;
  const { session, org } = result;

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  if (org.subscriptionStatus === "paused") {
    return NextResponse.json({ error: "Subscription is already paused" }, { status: 400 });
  }

  const { months } = (await req.json().catch(() => ({}))) as { months?: number };
  const pauseMonths = Math.min(12, Math.max(1, Math.round(months ?? 1)));

  const resumesAt = new Date();
  resumesAt.setMonth(resumesAt.getMonth() + pauseMonths);
  const resumesAtUnix = Math.floor(resumesAt.getTime() / 1000);

  // Void invoices during pause; auto-resume billing at resumesAt
  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    pause_collection: { behavior: "void", resumes_at: resumesAtUnix },
  });

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: {
      subscriptionStatus: "paused",
      subscriptionPeriodEnd: resumesAt,
    },
  });

  return NextResponse.json({ ok: true, resumesAt: resumesAt.toISOString() });
}

// PUT — resume a paused subscription (clears pause, billing restarts)
export async function PUT() {
  const result = await requireOwnerOrAdmin();
  if ("error" in result && result.error) return result.error;
  const { session, org } = result;

  if (!org?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    pause_collection: null as unknown as undefined,
  });

  await db.organization.update({
    where: { id: session!.user!.organizationId! },
    data: { subscriptionStatus: "active", subscriptionPeriodEnd: null },
  });

  return NextResponse.json({ ok: true });
}
