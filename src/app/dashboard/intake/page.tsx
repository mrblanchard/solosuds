import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import IntakeFormGrid from "@/components/intake/intake-form-grid";

export default async function IntakeFormsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const forms = await db.intakeForm.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intake Forms</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send paperless intake forms to clients before their first visit.
          </p>
        </div>
        <Link href="/dashboard/intake/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-400 mb-4">No intake forms yet</p>
          <Link href="/dashboard/intake/new">
            <Button variant="outline">Create your first form</Button>
          </Link>
        </div>
      ) : (
        <IntakeFormGrid
          forms={forms.map((f) => ({
            id: f.id,
            title: f.title,
            description: f.description,
            isActive: f.isActive,
            createdAt: f.createdAt.toISOString(),
            _count: f._count,
          }))}
        />
      )}
    </div>
  );
}
