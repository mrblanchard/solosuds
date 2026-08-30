import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { getFileBody } from "@/lib/storage";

// Full-account export: everything that belongs to the practice, for an owner
// who wants a complete local copy (a backup, or because they are leaving
// SoloSuds). Unlike the scoped per-type exports in ../clients, ../appointments,
// etc., this bundles actual SOAP/session note clinical content and the real
// uploaded document files, not just metadata, so access is restricted to the
// account Owner (not Admin) and every run is audit-logged.
//
// Give this route real headroom on Vercel — a practice with a lot of
// documents can take a while to zip up.
export const maxDuration = 60;

const MAX_ROWS = 10000; // per entity, matches the scoped export routes
const MAX_DOCUMENTS = 500;
const MAX_DOCUMENT_BYTES_TOTAL = 200 * 1024 * 1024; // 200MB combined, keeps the zip buildable in one serverless invocation

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function safeSegment(name: string, fallback: string): string {
  const cleaned = name.replace(/[^a-z0-9\-_ ]/gi, "").trim();
  return cleaned || fallback;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the account owner can download a full account export" },
        { status: 403 }
      );
    }

    const orgId = session.user.organizationId;

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        practiceType: true,
        phone: true,
        email: true,
        address: true,
        website: true,
        primaryColor: true,
        brandFont: true,
        emailSignature: true,
        replyToEmail: true,
        timezone: true,
        noteType: true,
        venmoHandle: true,
        cashAppHandle: true,
        paypalHandle: true,
        squareHandle: true,
        zelleHandle: true,
        bookingStartHour: true,
        bookingEndHour: true,
        bookingDays: true,
        bookingSlotMinutes: true,
        maxDailyAppointments: true,
        logoUrl: true,
        faviconUrl: true,
        createdAt: true,
      },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const zip = new JSZip();
    const dataFolder = zip.folder("data")!;
    const totalCounts: Record<string, number> = {};

    // ── Organization profile ──────────────────────────────────────────────
    dataFolder.file("organization.json", JSON.stringify(org, null, 2));

    // ── Team members (exclude password hashes and OAuth tokens) ──────────
    const users = await db.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, email: true, role: true, title: true, bio: true,
        phone: true, theme: true, createdAt: true,
      },
    });
    totalCounts.users = users.length;
    dataFolder.file(
      "team.csv",
      toCsv(
        [
          { key: "name", label: "Name" }, { key: "email", label: "Email" },
          { key: "role", label: "Role" }, { key: "title", label: "Title" },
          { key: "bio", label: "Bio" }, { key: "phone", label: "Phone" },
          { key: "createdAt", label: "Created At" },
        ],
        users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))
      )
    );

    // ── Clients ─────────────────────────────────────────────────────────
    const clients = await db.client.findMany({
      where: { organizationId: orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: MAX_ROWS,
    });
    totalCounts.clients = clients.length;
    dataFolder.file(
      "clients.csv",
      toCsv(
        [
          { key: "firstName", label: "First Name" }, { key: "lastName", label: "Last Name" },
          { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
          { key: "dateOfBirth", label: "Date of Birth" }, { key: "gender", label: "Gender" },
          { key: "pronouns", label: "Pronouns" }, { key: "address", label: "Address" },
          { key: "city", label: "City" }, { key: "state", label: "State" },
          { key: "zip", label: "Zip Code" }, { key: "country", label: "Country" },
          { key: "emergencyName", label: "Emergency Contact Name" },
          { key: "emergencyPhone", label: "Emergency Phone" },
          { key: "referralSource", label: "Referral Source" },
          { key: "internalNotes", label: "Internal Notes" }, { key: "status", label: "Status" },
          { key: "createdAt", label: "Created At" },
        ],
        clients.map((c) => ({
          ...c,
          dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().slice(0, 10) : "",
          createdAt: c.createdAt.toISOString(),
        }))
      )
    );

    // ── Services & Rooms ───────────────────────────────────────────────
    const services = await db.service.findMany({ where: { organizationId: orgId } });
    dataFolder.file(
      "services.csv",
      toCsv(
        [
          { key: "name", label: "Name" }, { key: "description", label: "Description" },
          { key: "durationMinutes", label: "Duration (min)" }, { key: "price", label: "Price" },
          { key: "isActive", label: "Active" },
        ],
        services.map((s) => ({ ...s, price: centsToDollars(s.price) }))
      )
    );
    const rooms = await db.room.findMany({ where: { organizationId: orgId } });
    dataFolder.file(
      "rooms.csv",
      toCsv([{ key: "name", label: "Name" }], rooms)
    );

    // ── Appointments ────────────────────────────────────────────────────
    const appointments = await db.appointment.findMany({
      where: { organizationId: orgId },
      orderBy: { startTime: "desc" },
      take: MAX_ROWS,
      include: {
        client: { select: { firstName: true, lastName: true } },
        practitioner: { select: { name: true } },
        service: { select: { name: true } },
        room: { select: { name: true } },
      },
    });
    totalCounts.appointments = appointments.length;
    dataFolder.file(
      "appointments.csv",
      toCsv(
        [
          { key: "clientName", label: "Client" }, { key: "startTime", label: "Start Time" },
          { key: "endTime", label: "End Time" }, { key: "status", label: "Status" },
          { key: "serviceName", label: "Service" }, { key: "practitionerName", label: "Practitioner" },
          { key: "roomName", label: "Room" }, { key: "notes", label: "Notes" },
          { key: "createdAt", label: "Created At" },
        ],
        appointments.map((a) => ({
          clientName: a.client ? `${a.client.firstName} ${a.client.lastName}` : "",
          startTime: a.startTime.toISOString(), endTime: a.endTime.toISOString(),
          status: a.status, serviceName: a.service?.name ?? "",
          practitionerName: a.practitioner?.name ?? "", roomName: a.room?.name ?? "",
          notes: a.notes ?? "", createdAt: a.createdAt.toISOString(),
        }))
      )
    );

    // ── Invoices ────────────────────────────────────────────────────────
    const invoices = await db.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: { client: { select: { firstName: true, lastName: true } } },
    });
    totalCounts.invoices = invoices.length;
    dataFolder.file(
      "invoices.csv",
      toCsv(
        [
          { key: "number", label: "Invoice Number" }, { key: "clientName", label: "Client" },
          { key: "status", label: "Status" }, { key: "subtotal", label: "Subtotal" },
          { key: "tax", label: "Tax" }, { key: "discountAmount", label: "Discount" },
          { key: "total", label: "Total" }, { key: "dueDate", label: "Due Date" },
          { key: "paidAt", label: "Paid At" }, { key: "notes", label: "Notes" },
          { key: "lineItems", label: "Line Items (JSON)" }, { key: "createdAt", label: "Created At" },
        ],
        invoices.map((inv) => ({
          number: inv.number, clientName: inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : "",
          status: inv.status, subtotal: centsToDollars(inv.subtotal), tax: centsToDollars(inv.tax),
          discountAmount: centsToDollars(inv.discountAmount), total: centsToDollars(inv.total),
          dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
          paidAt: inv.paidAt ? inv.paidAt.toISOString() : "", notes: inv.notes ?? "",
          lineItems: JSON.stringify(inv.lineItems), createdAt: inv.createdAt.toISOString(),
        }))
      )
    );

    // ── SOAP / session notes — FULL clinical content this time ─────────
    const notes = await db.soapNote.findMany({
      where: { organizationId: orgId },
      orderBy: { sessionDate: "desc" },
      take: MAX_ROWS,
      include: {
        client: { select: { firstName: true, lastName: true } },
        practitioner: { select: { name: true } },
      },
    });
    totalCounts.notes = notes.length;
    dataFolder.file(
      "soap-notes.csv",
      toCsv(
        [
          { key: "clientName", label: "Client" }, { key: "practitionerName", label: "Practitioner" },
          { key: "sessionDate", label: "Session Date" }, { key: "status", label: "Status" },
          { key: "noteFormat", label: "Format" }, { key: "subjective", label: "Subjective" },
          { key: "objective", label: "Objective" }, { key: "assessment", label: "Assessment" },
          { key: "plan", label: "Plan" }, { key: "sessionNotes", label: "Session Notes" },
          { key: "transcript", label: "Transcript" },
          { key: "diagnosisCodes", label: "Diagnosis Codes" }, { key: "procedureCodes", label: "Procedure Codes" },
          { key: "signedAt", label: "Signed At" }, { key: "createdAt", label: "Created At" },
        ],
        notes.map((n) => ({
          clientName: `${n.client.firstName} ${n.client.lastName}`, practitionerName: n.practitioner.name ?? "",
          sessionDate: n.sessionDate.toISOString().slice(0, 10), status: n.status, noteFormat: n.noteFormat,
          subjective: n.subjective ?? "", objective: n.objective ?? "", assessment: n.assessment ?? "",
          plan: n.plan ?? "", sessionNotes: n.sessionNotes ?? "", transcript: n.transcript ?? "",
          diagnosisCodes: n.diagnosisCodes.join("; "), procedureCodes: n.procedureCodes.join("; "),
          signedAt: n.signedAt ? n.signedAt.toISOString() : "", createdAt: n.createdAt.toISOString(),
        }))
      )
    );

    // ── Intake forms + submissions ──────────────────────────────────────
    const intakeForms = await db.intakeForm.findMany({ where: { organizationId: orgId } });
    dataFolder.file(
      "intake-forms.csv",
      toCsv(
        [
          { key: "title", label: "Title" }, { key: "description", label: "Description" },
          { key: "isActive", label: "Active" }, { key: "createdAt", label: "Created At" },
        ],
        intakeForms.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))
      )
    );
    const intakeSubmissions = await db.intakeSubmission.findMany({
      where: { form: { organizationId: orgId } },
      take: MAX_ROWS,
      include: { client: { select: { firstName: true, lastName: true } }, form: { select: { title: true } } },
    });
    dataFolder.file(
      "intake-submissions.json",
      JSON.stringify(
        intakeSubmissions.map((s) => ({
          formTitle: s.form.title,
          client: s.client ? `${s.client.firstName} ${s.client.lastName}` : null,
          responses: s.responses,
          submittedAt: s.submittedAt,
        })),
        null,
        2
      )
    );

    // ── Discount codes ──────────────────────────────────────────────────
    const discountCodes = await db.discountCode.findMany({ where: { organizationId: orgId } });
    dataFolder.file(
      "discount-codes.csv",
      toCsv(
        [
          { key: "code", label: "Code" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount" },
          { key: "active", label: "Active" }, { key: "usageCount", label: "Times Used" },
          { key: "expiresAt", label: "Expires At" },
        ],
        discountCodes.map((d) => ({ ...d, expiresAt: d.expiresAt ? d.expiresAt.toISOString() : "" }))
      )
    );

    // ── Waitlist ────────────────────────────────────────────────────────
    const waitlist = await db.waitlistEntry.findMany({ where: { organizationId: orgId }, take: MAX_ROWS });
    dataFolder.file(
      "waitlist.csv",
      toCsv(
        [
          { key: "clientFirstName", label: "First Name" }, { key: "clientLastName", label: "Last Name" },
          { key: "clientEmail", label: "Email" }, { key: "clientPhone", label: "Phone" },
          { key: "status", label: "Status" }, { key: "createdAt", label: "Created At" },
        ],
        waitlist.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() }))
      )
    );

    // ── Messages & Emails (communication history) ───────────────────────
    const messages = await db.message.findMany({
      where: { organizationId: orgId },
      take: MAX_ROWS,
      include: { client: { select: { firstName: true, lastName: true } } },
    });
    dataFolder.file(
      "messages.csv",
      toCsv(
        [
          { key: "clientName", label: "Client" }, { key: "channel", label: "Channel" },
          { key: "direction", label: "Direction" }, { key: "content", label: "Content" },
          { key: "status", label: "Status" }, { key: "createdAt", label: "Created At" },
        ],
        messages.map((m) => ({
          clientName: m.client ? `${m.client.firstName} ${m.client.lastName}` : "",
          channel: m.channel, direction: m.direction, content: m.content, status: m.status,
          createdAt: m.createdAt.toISOString(),
        }))
      )
    );
    const emails = await db.email.findMany({
      where: { organizationId: orgId },
      take: MAX_ROWS,
      include: { client: { select: { firstName: true, lastName: true } } },
    });
    dataFolder.file(
      "emails.csv",
      toCsv(
        [
          { key: "clientName", label: "Client" }, { key: "direction", label: "Direction" },
          { key: "toEmail", label: "To" }, { key: "fromEmail", label: "From" },
          { key: "subject", label: "Subject" }, { key: "htmlBody", label: "Body (HTML)" },
          { key: "createdAt", label: "Created At" },
        ],
        emails.map((e) => ({
          clientName: e.client ? `${e.client.firstName} ${e.client.lastName}` : "",
          direction: e.direction, toEmail: e.toEmail, fromEmail: e.fromEmail ?? "",
          subject: e.subject, htmlBody: e.htmlBody, createdAt: e.createdAt.toISOString(),
        }))
      )
    );

    // ── Tasks ───────────────────────────────────────────────────────────
    const tasks = await db.task.findMany({
      where: { organizationId: orgId },
      take: MAX_ROWS,
      include: { assignee: { select: { name: true } } },
    });
    dataFolder.file(
      "tasks.csv",
      toCsv(
        [
          { key: "title", label: "Title" }, { key: "description", label: "Description" },
          { key: "assigneeName", label: "Assignee" }, { key: "status", label: "Status" },
          { key: "priority", label: "Priority" }, { key: "dueDate", label: "Due Date" },
          { key: "createdAt", label: "Created At" },
        ],
        tasks.map((t) => ({
          title: t.title, description: t.description ?? "", assigneeName: t.assignee?.name ?? "",
          status: t.status, priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "", createdAt: t.createdAt.toISOString(),
        }))
      )
    );

    // ── Uploaded documents (the actual files) ───────────────────────────
    const documents = await db.document.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { firstName: true, lastName: true } } },
    });
    const filesFolder = zip.folder("documents")!;
    let bytesSoFar = 0;
    const skipped: string[] = [];
    let bundled = 0;
    for (const doc of documents) {
      if (bundled >= MAX_DOCUMENTS || bytesSoFar >= MAX_DOCUMENT_BYTES_TOTAL) {
        skipped.push(`${doc.name} (${doc.client ? `${doc.client.firstName} ${doc.client.lastName}` : "no client"}, uploaded ${doc.createdAt.toISOString().slice(0, 10)})`);
        continue;
      }
      const file = await getFileBody(doc.storageKey);
      if (!file) {
        skipped.push(`${doc.name} — file could not be retrieved from storage`);
        continue;
      }
      bytesSoFar += file.body.byteLength;
      bundled++;
      const clientFolder = doc.client
        ? safeSegment(`${doc.client.firstName} ${doc.client.lastName}`, doc.clientId!)
        : "unassigned";
      filesFolder.file(`${clientFolder}/${safeSegment(doc.name, doc.id)}`, file.body);
    }
    if (skipped.length > 0) {
      filesFolder.file(
        "SKIPPED_FILES.txt",
        `The following ${skipped.length} file(s) were not included in this export ` +
          `(export size limit reached). Download them individually from each client's ` +
          `Documents tab instead:\n\n${skipped.join("\n")}\n`
      );
    }

    // ── Branding assets ──────────────────────────────────────────────────
    const brandingFolder = zip.folder("branding")!;
    if (org.logoUrl) {
      const logo = await getFileBody(`org-branding/${orgId}/logo`);
      if (logo) {
        const ext = logo.contentType.split("/")[1]?.split("+")[0] ?? "png";
        brandingFolder.file(`logo.${ext}`, logo.body);
      }
    }
    if (org.faviconUrl) {
      const favicon = await getFileBody(`org-branding/${orgId}/favicon`);
      if (favicon) {
        const ext = favicon.contentType.split("/")[1]?.split("+")[0] ?? "png";
        brandingFolder.file(`favicon.${ext}`, favicon.body);
      }
    }

    // ── README ────────────────────────────────────────────────────────
    zip.file(
      "README.txt",
      `SoloSuds full account export
Organization: ${org.name}
Generated: ${new Date().toISOString()}

This archive contains everything stored in your SoloSuds account:

data/organization.json      Your practice profile and settings
data/team.csv                Team members
data/clients.csv             Your client list
data/services.csv, rooms.csv Services and rooms
data/appointments.csv        Appointment history
data/invoices.csv            Billing history
data/soap-notes.csv          Full SOAP/session note content
data/intake-forms.csv, intake-submissions.json   Intake forms and client responses
data/discount-codes.csv      Discount codes
data/waitlist.csv            Waitlist entries
data/messages.csv, emails.csv   Communication history with clients
data/tasks.csv                Internal tasks
documents/                    Uploaded client files, grouped by client
branding/                     Your logo and favicon, if set

${skipped.length > 0 ? `Note: ${skipped.length} document(s) were too large to include, see documents/SKIPPED_FILES.txt.` : ""}
`
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const recordCount = Object.values(totalCounts).reduce((a, b) => a + b, 0) + bundled;
    await db.exportAuditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id!,
        dataType: "full-account",
        recordCount,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
      },
    });

    const filename = `solosuds-export-${org.slug}-${new Date().toISOString().slice(0, 10)}.zip`;
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/export/all]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
