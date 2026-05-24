import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AppointmentForm from "@/components/schedule/appointment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; start?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const params = await searchParams;

  const [clients, services] = await Promise.all([
    db.client.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.service.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, durationMinutes: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/schedule"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Schedule
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Book Appointment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentForm
            clients={clients}
            services={services}
            currentUserId={session!.user!.id}
            defaultClientId={params.clientId}
            defaultStartTime={params.start}
          />
        </CardContent>
      </Card>
    </div>
  );
}
