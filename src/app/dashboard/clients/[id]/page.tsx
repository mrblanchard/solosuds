import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileText, CalendarDays, CreditCard, Plus, Mail, Phone, MapPin, User } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import ClientActions from "@/components/clients/client-actions";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const { id } = await params;

  const client = await db.client.findFirst({
    where: { id, organizationId: orgId },
    include: {
      tags: true,
      soapNotes: {
        orderBy: { sessionDate: "desc" },
        take: 5,
        include: { practitioner: { select: { name: true } } },
      },
      appointments: {
        orderBy: { startTime: "desc" },
        take: 5,
        include: { service: true, practitioner: { select: { name: true } } },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Clients
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">
            {client.firstName} {client.lastName}
          </h1>
          <Badge variant={client.status === "ACTIVE" ? "success" : "secondary"}>
            {client.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/notes/new?clientId=${client.id}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              New Note
            </Button>
          </Link>
          <Link href={`/dashboard/schedule/new?clientId=${client.id}`}>
            <Button variant="outline" size="sm">
              <CalendarDays className="h-4 w-4 mr-1" />
              Book Appt
            </Button>
          </Link>
          <Link href={`/dashboard/clients/${client.id}/edit`}>
            <Button size="sm">Edit Profile</Button>
          </Link>
          <ClientActions
            clientId={client.id}
            clientName={`${client.firstName} ${client.lastName}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={User} label="Full Name" value={`${client.firstName} ${client.lastName}`} />
              {client.email && <InfoRow icon={Mail} label="Email" value={client.email} />}
              {client.phone && <InfoRow icon={Phone} label="Phone" value={client.phone} />}
              {client.dateOfBirth && (
                <InfoRow icon={User} label="Date of Birth" value={formatDate(client.dateOfBirth, "MMMM d, yyyy")} />
              )}
              {(client.address || client.city) && (
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={[client.address, client.city, client.state, client.zip]
                    .filter(Boolean)
                    .join(", ")}
                />
              )}
              {client.emergencyName && (
                <InfoRow icon={Phone} label="Emergency Contact" value={`${client.emergencyName} — ${client.emergencyPhone}`} />
              )}
            </CardContent>
          </Card>

          {client.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {client.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{client.internalNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Feed */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent SOAP Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>SOAP Notes</CardTitle>
              <Link
                href={`/dashboard/notes?clientId=${client.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {client.soapNotes.length === 0 ? (
                <EmptyState icon={FileText} label="No notes yet" action={{ href: `/dashboard/notes/new?clientId=${client.id}`, label: "Start first note" }} />
              ) : (
                <div className="space-y-2">
                  {client.soapNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/dashboard/notes/${note.id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(note.sessionDate)}
                        </p>
                        <p className="text-xs text-gray-500">{note.practitioner.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={note.status === "SIGNED" ? "success" : "warning"}>
                          {note.status}
                        </Badge>
                        <span className="text-xs text-gray-400">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Appointments</CardTitle>
              <Link
                href={`/dashboard/schedule/new?clientId=${client.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="h-4 w-4 inline" /> Book
              </Link>
            </CardHeader>
            <CardContent>
              {client.appointments.length === 0 ? (
                <EmptyState icon={CalendarDays} label="No appointments" action={{ href: `/dashboard/schedule/new?clientId=${client.id}`, label: "Book appointment" }} />
              ) : (
                <div className="space-y-2">
                  {client.appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(appt.startTime, "MMM d, yyyy · h:mm a")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appt.service?.name ?? "Session"} · {appt.practitioner.name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          appt.status === "COMPLETED"
                            ? "success"
                            : appt.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {appt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <Link
                href={`/dashboard/billing/new?clientId=${client.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="h-4 w-4 inline" /> Invoice
              </Link>
            </CardHeader>
            <CardContent>
              {client.invoices.length === 0 ? (
                <EmptyState icon={CreditCard} label="No invoices" action={{ href: `/dashboard/billing/new?clientId=${client.id}`, label: "Create invoice" }} />
              ) : (
                <div className="space-y-2">
                  {client.invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/dashboard/billing/${inv.id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{inv.number}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.createdAt, "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(inv.total)}
                        </span>
                        <Badge
                          variant={
                            inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "destructive" : "secondary"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  label,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Icon className="h-8 w-8 text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">{label}</p>
      <Link href={action.href} className="mt-2 text-xs text-indigo-600 hover:underline">
        {action.label} →
      </Link>
    </div>
  );
}
