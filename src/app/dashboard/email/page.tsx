import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConversationList from "@/components/email/conversation-list";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;
  const { view } = await searchParams;
  const showArchived = view === "archived";

  // Get all clients that have emails matching the current view
  const clients = await db.client.findMany({
    where: {
      organizationId: orgId,
      emails: { some: { archived: showArchived } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emails: {
        where: { archived: showArchived },
        select: {
          id: true,
          direction: true,
          subject: true,
          read: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          emails: {
            where: { direction: "INBOUND", read: false, archived: false },
          },
        },
      },
    },
    orderBy: { emails: { _count: "desc" } },
  });

  // Sort by latest email date
  const conversations = clients
    .map((c) => ({
      clientId: c.id,
      clientName: `${c.firstName} ${c.lastName}`,
      clientEmail: c.email,
      lastEmail: c.emails[0] || null,
      unreadCount: c._count.emails,
    }))
    .sort((a, b) => {
      if (!a.lastEmail) return 1;
      if (!b.lastEmail) return -1;
      return new Date(b.lastEmail.createdAt).getTime() - new Date(a.lastEmail.createdAt).getTime();
    });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email</h1>
          <p className="mt-1 text-sm text-gray-500">Conversations with your clients</p>
        </div>
        <Link href="/dashboard/email/compose">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Message
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 bg-white rounded-t-xl px-2 pt-1">
        <Link
          href="/dashboard/email"
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            !showArchived
              ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Inbox
        </Link>
        <Link
          href="/dashboard/email?view=archived"
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            showArchived
              ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Archived
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ConversationList conversations={JSON.parse(JSON.stringify(conversations))} />
      </div>
    </div>
  );
}

