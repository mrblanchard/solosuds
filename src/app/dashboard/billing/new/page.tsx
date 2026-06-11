import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import NewInvoiceForm from "@/components/billing/new-invoice-form";

interface Props {
  searchParams: Promise<{ clientId?: string; appointmentId?: string }>;
}

export default async function NewInvoicePage({ searchParams }: Props) {
  const { clientId, appointmentId } = await searchParams;
  const session = await auth();
  if (!session?.user?.organizationId) notFound();

  const clients = await db.client.findMany({
    where: { organizationId: session.user.organizationId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <Link href="/dashboard/billing">
          <Button variant="outline" size="sm">← Back to Billing</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <NewInvoiceForm
          clients={clients}
          defaultClientId={clientId}
          defaultAppointmentId={appointmentId}
        />
      </div>
    </div>
  );
}
