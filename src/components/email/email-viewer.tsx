"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Reply, Paperclip } from "lucide-react";

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
}

interface EmailDetail {
  id: string;
  direction: string;
  fromEmail: string | null;
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  attachments: Attachment[] | null;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; email: string | null } | null;
  sender: { id: string; name: string | null } | null;
}

interface Props {
  email: EmailDetail;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailViewer({ email }: Props) {
  const router = useRouter();
  const isInbound = email.direction === "INBOUND";

  const replyParams = new URLSearchParams();
  if (email.client?.id) replyParams.set("clientId", email.client.id);
  // For inbound, reply goes to the sender; for outbound, reply to original recipient
  replyParams.set("toEmail", isInbound ? (email.fromEmail || email.client?.email || "") : email.toEmail);
  replyParams.set("subject", email.subject);

  const fromDisplay = isInbound
    ? (email.client ? `${email.client.firstName} ${email.client.lastName} <${email.fromEmail}>` : email.fromEmail || "Unknown")
    : (email.sender?.name ?? "Unknown");

  const toDisplay = isInbound
    ? email.toEmail
    : (email.client ? `${email.client.firstName} ${email.client.lastName} <${email.toEmail}>` : email.toEmail);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard/email")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to emails
        </button>
        <Button
          size="sm"
          onClick={() => router.push(`/dashboard/email/compose?${replyParams.toString()}`)}
        >
          <Reply className="h-4 w-4 mr-1" /> Reply
        </Button>
      </div>

      {/* Email card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Subject bar */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isInbound && (
              <span className="text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                Received
              </span>
            )}
            <h2 className="text-lg font-semibold text-gray-900">{email.subject}</h2>
          </div>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/50 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <span className="text-gray-500">From:</span>{" "}
            <span className="text-gray-900">{fromDisplay}</span>
          </div>
          <div>
            <span className="text-gray-500">To:</span>{" "}
            <span className="text-gray-900">{toDisplay}</span>
          </div>
          <div>
            <span className="text-gray-500">Date:</span>{" "}
            <span className="text-gray-900">{format(new Date(email.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="px-6 py-2 border-b border-gray-100 flex flex-wrap gap-2">
            {email.attachments.map((att, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs rounded-md px-2 py-1">
                <Paperclip className="h-3 w-3" />
                {att.filename}
                <span className="text-gray-400">({formatSize(att.size)})</span>
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div
          className="px-6 py-6 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: email.htmlBody }}
        />
      </div>
    </div>
  );
}
