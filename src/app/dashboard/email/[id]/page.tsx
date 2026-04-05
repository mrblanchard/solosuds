import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import EmailViewer from "@/components/email/email-viewer";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const { id } = await params;

  const email = await db.email.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: {
      id: true,
      toEmail: true,
      subject: true,
      htmlBody: true,
      attachments: true,
      createdAt: true,
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      sender: { select: { id: true, name: true } },
    },
  });

  if (!email) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <EmailViewer email={JSON.parse(JSON.stringify(email))} />
    </div>
  );
}
