"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Mail, MessageCircle } from "lucide-react";

interface Conversation {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  lastEmail: {
    id: string;
    direction: string;
    subject: string;
    read: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface Props {
  conversations: Conversation[];
}

export default function ConversationList({ conversations }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No conversations yet</p>
        <p className="text-gray-400 text-xs mt-1">Send your first email to start a conversation</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const hasUnread = conv.unreadCount > 0;
        const lastDir = conv.lastEmail?.direction === "INBOUND" ? "Received" : "Sent";

        return (
          <Link
            key={conv.clientId}
            href={`/dashboard/email/${conv.clientId}`}
            className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${
              hasUnread ? "bg-indigo-50/40" : ""
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm">
              {conv.clientName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm truncate ${hasUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                  {conv.clientName}
                </span>
                {hasUnread && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className={`text-sm truncate ${hasUnread ? "text-gray-700" : "text-gray-500"}`}>
                <span className="text-gray-400">{lastDir}:</span>{" "}
                {conv.lastEmail?.subject || "(No subject)"}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {conv.lastEmail && (
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(conv.lastEmail.createdAt), { addSuffix: true })}
                </span>
              )}
              <MessageCircle className={`h-3.5 w-3.5 ${hasUnread ? "text-indigo-500" : "text-gray-300"}`} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
