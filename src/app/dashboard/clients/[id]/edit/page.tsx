import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ClientForm from "@/components/clients/client-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientEditPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) notFound();

  const client = await db.client.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!client) notFound();

  const defaultValues = {
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email ?? "",
    phone: client.phone ?? "",
    dateOfBirth: client.dateOfBirth ? client.dateOfBirth.toISOString().split("T")[0] : "",
    gender: client.gender ?? "",
    pronouns: client.pronouns ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    zip: client.zip ?? "",
    country: client.country ?? "US",
    emergencyName: client.emergencyName ?? "",
    emergencyPhone: client.emergencyPhone ?? "",
    referralSource: client.referralSource ?? "",
    internalNotes: client.internalNotes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Client</h1>
        <p className="mt-1 text-sm text-gray-500">
          {client.firstName} {client.lastName}
        </p>
      </div>
      <ClientForm defaultValues={defaultValues} clientId={client.id} />
    </div>
  );
}
