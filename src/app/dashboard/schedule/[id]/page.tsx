import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AppointmentStatusActions from "@/components/schedule/appointment-status-actions";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  CONFIRMED: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "warning",
};

export default async function AppointmentDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) notFound();

  const appointment = await db.appointment.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      client: true,
      practitioner: { select: { id: true, name: true, email: true } },
      service: true,
      room: true,
      soapNotes: { select: { id: true, createdAt: true, status: true }, orderBy: { createdAt: "desc" } },
      invoices: { select: { id: true, number: true, status: true, total: true } },
    },
  });

  if (!appointment) notFound();

  const durationMin = Math.round(
    (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between rounded-xl bg-white/80 backdrop-blur-sm px-4 py-3 -mx-2">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {appointment.client.firstName} {appointment.client.lastName}
            </h1>
            <Badge variant={STATUS_VARIANT[appointment.status] ?? "secondary"}>
              {appointment.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateTime(appointment.startTime)} · {durationMin} min
          </p>
        </div>
        <Link href="/dashboard/schedule">
          <Button variant="outline" size="sm">← Back to Schedule</Button>
        </Link>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <p className="text-xs font-medium uppercase text-gray-400">Appointment Details</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Client</span>
              <Link
                href={`/dashboard/clients/${appointment.clientId}`}
                className="text-indigo-600 hover:underline font-medium"
              >
                {appointment.client.firstName} {appointment.client.lastName}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Practitioner</span>
              <span className="text-gray-900">{appointment.practitioner?.name ?? "—"}</span>
            </div>
            {appointment.service && (
              <div className="flex justify-between">
                <span className="text-gray-500">Service</span>
                <span className="text-gray-900">{appointment.service.name}</span>
              </div>
            )}
            {appointment.room && (
              <div className="flex justify-between">
                <span className="text-gray-500">Room</span>
                <span className="text-gray-900">{appointment.room.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-900">{formatDate(appointment.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="text-gray-900">{durationMin} min</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <p className="text-xs font-medium uppercase text-gray-400">Actions</p>
          <AppointmentStatusActions
            appointmentId={appointment.id}
            currentStatus={appointment.status}
          />
          <div className="pt-2 space-y-2">
            <Link
              href={`/dashboard/notes/new?clientId=${appointment.clientId}&appointmentId=${appointment.id}`}
            >
              <Button variant="outline" size="sm" className="w-full">
                + Create SOAP Note
              </Button>
            </Link>
            <Link
              href={`/dashboard/billing/new?clientId=${appointment.clientId}&appointmentId=${appointment.id}`}
            >
              <Button variant="outline" size="sm" className="w-full">
                + Create Invoice
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Notes */}
      {appointment.notes && (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-400 mb-2">Internal Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{appointment.notes}</p>
        </div>
      )}

      {/* SOAP Notes */}
      {appointment.soapNotes.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-medium uppercase text-gray-500">SOAP Notes</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {appointment.soapNotes.map((note) => (
              <li key={note.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700">{formatDate(note.createdAt)}</span>
                <div className="flex items-center gap-3">
                  <Badge variant={note.status === "SIGNED" ? "success" : "secondary"}>
                    {note.status}
                  </Badge>
                  <Link
                    href={`/dashboard/notes/${note.id}`}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invoices */}
      {appointment.invoices.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-medium uppercase text-gray-500">Invoices</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {appointment.invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-gray-900">#{inv.number}</span>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[inv.status] ?? "secondary"}>{inv.status}</Badge>
                  <Link
                    href={`/dashboard/billing/${inv.id}`}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
