import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import MessageComposer from "@/components/messages/message-composer";
import { ArrowLeft } from "lucide-react";

interface Props {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function MessagesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;
  const { clientId: selectedClientId } = await searchParams;

  // Get all clients that have messages (or all active clients for composing)
  const [clients, messages] = await Promise.all([
    db.client.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    selectedClientId
      ? db.message.findMany({
          where: { organizationId: orgId, clientId: selectedClientId },
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [],
  ]);

  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Client list — full width on mobile when no client selected; hidden on mobile when thread is open */}
      <aside className={`flex flex-col border-r border-gray-100 w-full md:w-72 md:flex md:shrink-0 ${selectedClient ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No active clients</p>
          ) : (
            <ul>
              {clients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/dashboard/messages?clientId=${client.id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      client.id === selectedClientId ? "bg-indigo-50 border-r-2 border-indigo-500" : ""
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600 shrink-0">
                      {client.firstName[0]}{client.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {client.firstName} {client.lastName}
                      </p>
                      {client.email && (
                        <p className="text-xs text-gray-400 truncate">{client.email}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Message thread — full width on mobile when client selected; hidden on mobile otherwise */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedClient ? "hidden md:flex" : "flex"}`}>
        {selectedClient ? (
          <>
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back to client list on mobile */}
                <Link
                  href="/dashboard/messages"
                  className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-gray-500 hover:text-gray-700"
                  aria-label="Back to contacts"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </h2>
                  {selectedClient.email && (
                    <p className="text-xs text-gray-400 truncate">{selectedClient.email}</p>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/clients/${selectedClient.id}`}
                className="text-xs text-indigo-600 hover:underline shrink-0"
              >
                View profile →
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">
                  No messages yet. Send the first one below.
                </p>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === "OUTBOUND";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${
                          isOutbound
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <div className={`mt-1 flex items-center gap-2 text-xs ${isOutbound ? "text-indigo-200" : "text-gray-400"}`}>
                          <span>{formatDate(msg.createdAt)}</span>
                          {msg.sender && <span>· {msg.sender.name}</span>}
                          <Badge
                            variant={
                              msg.status === "DELIVERED" ? "success" :
                              msg.status === "FAILED" ? "destructive" : "secondary"
                            }
                          >
                            {msg.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <MessageComposer clientId={selectedClient.id} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Select a client to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
