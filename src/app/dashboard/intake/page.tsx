import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, Send } from "lucide-react";

export default async function IntakeFormsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const forms = await db.intakeForm.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
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
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400 mb-4">No intake forms yet</p>
          <Link href="/dashboard/intake/new">
            <Button variant="outline">Create your first form</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="rounded-xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{form.title}</h3>
                  {form.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{form.description}</p>
                  )}
                </div>
                <Badge variant={form.isActive ? "success" : "secondary"}>
                  {form.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                {form._count.submissions} submission{form._count.submissions !== 1 ? "s" : ""} ·
                Created {formatDate(form.createdAt)}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link href={`/dashboard/intake/${form.id}`}>
                  <Button size="sm" variant="outline">Edit</Button>
                </Link>
                <Link href={`/dashboard/intake/${form.id}/submissions`}>
                  <Button size="sm" variant="ghost">Submissions</Button>
                </Link>
                <button
                  title="Copy link"
                  className="ml-auto text-gray-400 hover:text-indigo-600 transition-colors"
                  onClick={() => navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/intake/${form.id}`)}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
