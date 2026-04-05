import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ComposeEmail from "@/components/email/compose-email";

export default async function ComposeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; toEmail?: string; subject?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const params = await searchParams;

  const clients = await db.client.findMany({
    where: { organizationId: session.user.organizationId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const replyTo = params.toEmail
    ? { clientId: params.clientId ?? "", toEmail: params.toEmail, subject: params.subject ?? "" }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {replyTo ? "Reply" : "Compose Email"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {replyTo ? `Replying to ${replyTo.toEmail}` : "Send an email to a client"}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ComposeEmail
          clients={JSON.parse(JSON.stringify(clients))}
          replyTo={replyTo}
        />
      </div>
    </div>
  );
}
