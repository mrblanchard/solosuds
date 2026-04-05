"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Mail, Paperclip } from "lucide-react";

interface EmailItem {
  id: string;
  toEmail: string;
  subject: string;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string } | null;
  sender: { id: string; name: string | null } | null;
}

interface Props {
  emails: EmailItem[];
}

export default function EmailList({ emails }: Props) {
  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No emails sent yet</p>
        <p className="text-gray-400 text-xs mt-1">Compose your first email to a client</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={`/dashboard/email/${email.id}`}
          className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Mail className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {email.client
                  ? `${email.client.firstName} ${email.client.lastName}`
                  : email.toEmail}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{email.subject}</p>
          </div>
          <div className="text-xs text-gray-400 shrink-0">
            {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
          </div>
        </Link>
      ))}
    </div>
  );
}
