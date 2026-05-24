import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH — update account preferences (notificationsEnabled)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { notificationsEnabled } = body;

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(notificationsEnabled !== undefined && { notificationsEnabled }),
    },
    select: { id: true, notificationsEnabled: true },
  });

  return NextResponse.json(updated);
}

// DELETE — delete account and all organization data (owner only)
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the account owner can delete the account" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  // Cancel Stripe subscription if exists
  if (user.organization?.stripeSubscriptionId) {
    try {
      const { stripe } = await import("@/lib/stripe");
      await stripe.subscriptions.cancel(user.organization.stripeSubscriptionId);
    } catch {
      // Continue even if Stripe cancel fails — account should still be deleted
    }
  }

  // Delete in dependency order
  await db.$transaction([
    db.intakeSubmission.deleteMany({ where: { form: { organizationId: orgId } } }),
    db.intakeForm.deleteMany({ where: { organizationId: orgId } }),
    db.message.deleteMany({ where: { organizationId: orgId } }),
    db.invoice.deleteMany({ where: { organizationId: orgId } }),
    db.soapNote.deleteMany({ where: { organizationId: orgId } }),
    db.noteTemplate.deleteMany({ where: { organizationId: orgId } }),
    db.appointment.deleteMany({ where: { organizationId: orgId } }),
    db.clientTag.deleteMany({ where: { client: { organizationId: orgId } } }),
    db.client.deleteMany({ where: { organizationId: orgId } }),
    db.service.deleteMany({ where: { organizationId: orgId } }),
    db.room.deleteMany({ where: { organizationId: orgId } }),
    db.session.deleteMany({ where: { userId: session.user.id } }),
    db.account.deleteMany({ where: { userId: session.user.id } }),
    db.user.delete({ where: { id: session.user.id } }),
    db.organization.delete({ where: { id: orgId } }),
  ]);

  return NextResponse.json({ ok: true });
}
