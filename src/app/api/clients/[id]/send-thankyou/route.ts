import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendThankYouEmail } from "@/lib/email";
import { formatDate } from "@/lib/utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id: clientId } = await params;
  const body = await req.json();
  const sessionDate: string | undefined = body.sessionDate;

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { firstName: true, lastName: true, email: true },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!client.email) return NextResponse.json({ error: "Client has no email address" }, { status: 400 });

  const practitioner = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  const branding = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
  });

  await sendThankYouEmail({
    to: client.email,
    clientName: `${client.firstName} ${client.lastName}`,
    practitionerName: practitioner?.name ?? "Your Practitioner",
    sessionDate: sessionDate ?? formatDate(new Date()),
    branding,
  });

  return NextResponse.json({ success: true });
}
