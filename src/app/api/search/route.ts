import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = q.toLowerCase();

  const [clients, appointments, invoices, notes, forms, messages] =
    await Promise.all([
      db.client.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true },
        take: 5,
      }),
      db.appointment.findMany({
        where: {
          organizationId: orgId,
          client: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
        select: {
          id: true,
          startTime: true,
          status: true,
          client: { select: { firstName: true, lastName: true } },
        },
        orderBy: { startTime: "desc" },
        take: 5,
      }),
      db.invoice.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            {
              client: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          client: { select: { firstName: true, lastName: true } },
        },
        take: 5,
      }),
      db.soapNote.findMany({
        where: {
          organizationId: orgId,
          client: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
        select: {
          id: true,
          sessionDate: true,
          status: true,
          client: { select: { firstName: true, lastName: true } },
        },
        orderBy: { sessionDate: "desc" },
        take: 5,
      }),
      db.intakeForm.findMany({
        where: {
          organizationId: orgId,
          title: { contains: q, mode: "insensitive" },
        },
        select: { id: true, title: true, isActive: true },
        take: 5,
      }),
      db.message.findMany({
        where: {
          organizationId: orgId,
          content: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          client: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const results = [
    ...clients.map((c) => ({
      type: "client" as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email ?? undefined,
      href: `/dashboard/clients/${c.id}`,
    })),
    ...appointments.map((a) => ({
      type: "appointment" as const,
      id: a.id,
      title: a.client ? `${a.client.firstName} ${a.client.lastName}` : "No client",
      subtitle: `Appointment · ${new Date(a.startTime).toLocaleDateString()} · ${a.status}`,
      href: `/dashboard/schedule/${a.id}`,
    })),
    ...invoices.map((i) => ({
      type: "invoice" as const,
      id: i.id,
      title: `Invoice #${i.number}`,
      subtitle: `${i.client.firstName} ${i.client.lastName} · ${i.status}`,
      href: `/dashboard/billing/${i.id}`,
    })),
    ...notes.map((n) => ({
      type: "note" as const,
      id: n.id,
      title: `SOAP Note — ${n.client.firstName} ${n.client.lastName}`,
      subtitle: `${new Date(n.sessionDate).toLocaleDateString()} · ${n.status}`,
      href: `/dashboard/notes/${n.id}`,
    })),
    ...forms.map((f) => ({
      type: "form" as const,
      id: f.id,
      title: f.title,
      subtitle: f.isActive ? "Active intake form" : "Inactive",
      href: `/dashboard/intake/${f.id}`,
    })),
    ...messages.map((m) => ({
      type: "message" as const,
      id: m.id,
      title: "Message",
      subtitle: m.client
        ? `${m.client.firstName} ${m.client.lastName} · ${m.content.slice(0, 60)}`
        : m.content.slice(0, 80),
      href: `/dashboard/messages`,
    })),
  ];

  // Deduplicate by id (shouldn't happen but safety)
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.type}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ results: deduped });
}
