import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ClientActions from "@/components/clients/client-actions";
import ClientSections from "@/components/clients/client-sections";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const userId = session?.user?.id ?? "unknown";
  const { id } = await params;

  const [client, org, documents] = await Promise.all([
    db.client.findFirst({
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
    }),
    db.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    }),
    db.document.findMany({
      where: { clientId: id, organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        direction: true,
        uploadedBy: true,
        createdAt: true,
      },
    }),
  ]);

  if (!client) notFound();

  return (
    <div className="space-y-4">
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
        <ClientActions
          clientId={client.id}
          clientName={`${client.firstName} ${client.lastName}`}
        />
      </div>

      <ClientSections
        userId={userId}
        clientId={client.id}
        firstName={client.firstName}
        lastName={client.lastName}
        email={client.email}
        phone={client.phone}
        dateOfBirth={client.dateOfBirth ? formatDate(client.dateOfBirth, "MMMM d, yyyy") : null}
        address={client.address}
        city={client.city}
        state={client.state}
        zip={client.zip}
        emergencyName={client.emergencyName}
        emergencyPhone={client.emergencyPhone}
        tags={client.tags}
        internalNotes={client.internalNotes}
        soapNotes={client.soapNotes}
        appointments={client.appointments}
        invoices={client.invoices}
        orgSlug={org?.slug ?? ""}
        documents={documents}
      />
    </div>
  );
}
