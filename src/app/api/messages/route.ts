import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSms, buildFreeformMessageSms } from "@/lib/twilio";

// This inbox is SMS-only. Email already has its own dedicated, fully-featured
// surface at /dashboard/email (a separate Email model with inbound receiving
// via Resend) — routing "email" through here too would just create a second,
// disconnected place emails live.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, content } = body;

    if (!clientId || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "clientId and content are required" }, { status: 400 });
    }
    if (content.length > 1500) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const [client, org] = await Promise.all([
      db.client.findFirst({
        where: { id: clientId, organizationId: session.user.organizationId },
        select: { id: true, phone: true, smsConsentedAt: true },
      }),
      db.organization.findUnique({ where: { id: session.user.organizationId }, select: { name: true } }),
    ]);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (!client.phone) {
      return NextResponse.json({ error: "This client has no phone number on file" }, { status: 400 });
    }
    if (!client.smsConsentedAt) {
      return NextResponse.json({ error: "This client hasn't opted in to text messages" }, { status: 400 });
    }

    let sid: string | undefined;
    try {
      const result = await sendSms({
        to: client.phone,
        body: buildFreeformMessageSms({ orgName: org.name, content }),
      });
      sid = result.sid;
    } catch (err) {
      console.error("[POST /api/messages] Twilio send failed:", err);
      return NextResponse.json({ error: "Failed to send text" }, { status: 500 });
    }

    const message = await db.message.create({
      data: {
        organizationId: session.user.organizationId,
        clientId,
        senderId: session.user.id,
        content,
        channel: "SMS",
        direction: "OUTBOUND",
        status: "SENT",
        externalId: sid,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[POST /api/messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const messages = await db.message.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(clientId && { clientId }),
      },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[GET /api/messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
