import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Inbox } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const form = await db.intakeForm.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true, title: true, fields: true },
  });

  if (!form) redirect("/dashboard/intake");

  const submissions = await db.intakeSubmission.findMany({
    where: { formId: id },
    include: {
      client: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const fields = (form.fields as { id: string; label: string; type: string }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/intake"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Intake Forms
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 truncate">
          {form.title}: Submissions
        </h1>
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Inbox className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-400">No submissions yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Share the form link with your clients to start receiving responses.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-3">
            {submissions.map((sub) => {
              const responses = sub.responses as Record<string, string>;
              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      {sub.client ? (
                        <p className="font-semibold text-gray-900">
                          {sub.client.firstName} {sub.client.lastName}
                        </p>
                      ) : (
                        <Badge variant="secondary">Anonymous</Badge>
                      )}
                      {sub.client?.email && (
                        <p className="text-sm text-gray-400">{sub.client.email}</p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">
                      {formatDate(sub.submittedAt)}
                    </time>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {fields.map((field) => {
                      const value = responses[field.id];
                      if (!value) return null;
                      return (
                        <div key={field.id}>
                          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            {field.label}
                          </dt>
                          <dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">
                            {value}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
