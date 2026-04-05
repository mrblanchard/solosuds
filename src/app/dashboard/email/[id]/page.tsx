import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import EmailThread from "@/components/email/email-thread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const { id: clientId } = await params;
  const orgId = session.user.organizationId;

  // Verify client belongs to this org
  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!client) notFound();

  // Get all emails in this conversation
  const emails = await db.email.findMany({
    where: { organizationId: orgId, clientId },
    select: {
      id: true,
      direction: true,
      fromEmail: true,
      toEmail: true,
      subject: true,
      htmlBody: true,
      textBody: true,
      attachments: true,
      read: true,
      createdAt: true,
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread inbound emails as read
  const unreadIds = emails.filter((e) => e.direction === "INBOUND" && !e.read).map((e) => e.id);
  if (unreadIds.length > 0) {
    await db.email.updateMany({
      where: { id: { in: unreadIds } },
      data: { read: true },
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <EmailThread
        client={JSON.parse(JSON.stringify(client))}
        emails={JSON.parse(JSON.stringify(emails))}
      />
    </div>
  );
}
