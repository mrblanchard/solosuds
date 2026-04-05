"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Paperclip, X } from "lucide-react";

const CKEditorWrapper = dynamic(
  () => import("@/components/email/ckeditor-wrapper"),
  { ssr: false, loading: () => <div className="h-[150px] bg-gray-50 animate-pulse rounded" /> }
);

interface Attachment {
  filename: string;
  contentType: string;
  size?: number;
}

interface EmailMessage {
  id: string;
  direction: string;
  fromEmail: string | null;
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  attachments: Attachment[] | null;
  read: boolean;
  createdAt: string;
  sender: { id: string; name: string | null } | null;
}

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Props {
  client: ClientInfo;
  emails: EmailMessage[];
}

const ALLOWED_EXTENSIONS = ".pdf,.csv,.xlsx,.xls,.zip,.png,.jpg,.jpeg,.gif,.webp";

export default function EmailThread({ client, emails }: Props) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  // Scroll to bottom on load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [emails.length]);

  // Auto-set reply subject from last email
  useEffect(() => {
    if (emails.length > 0) {
      const lastSubject = emails[emails.length - 1].subject;
      setSubject(lastSubject.startsWith("Re: ") ? lastSubject : `Re: ${lastSubject}`);
    }
  }, [emails]);

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSend() {
    const htmlBody = editorContentRef.current;
    if (!subject || !htmlBody.trim()) {
      setError("Subject and message are required");
      return;
    }
    if (!client.email) {
      setError("Client has no email address");
      return;
    }

    setSending(true);
    setError(null);

    const formData = new FormData();
    formData.append("clientId", client.id);
    formData.append("toEmail", client.email);
    formData.append("subject", subject);
    formData.append("htmlBody", htmlBody);
    for (const file of attachments) {
      formData.append("attachments", file);
    }

    const res = await fetch("/api/emails", { method: "POST", body: formData });
    setSending(false);

    if (res.ok) {
      setAttachments([]);
      editorContentRef.current = "";
      setShowCompose(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to send email");
    }
  }

  const clientName = `${client.firstName} ${client.lastName}`;
  const initials = clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard/email")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm">
          {initials}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{clientName}</h1>
          <p className="text-xs text-gray-500">{client.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 mb-6">
        {emails.map((email) => {
          const isOutbound = email.direction === "OUTBOUND";
          return (
            <div
              key={email.id}
              className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isOutbound
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                }`}
              >
                {/* Subject */}
                <p className={`text-xs font-medium mb-1 ${isOutbound ? "text-indigo-200" : "text-gray-500"}`}>
                  {email.subject}
                </p>

                {/* Body */}
                <div
                  className={`prose prose-sm max-w-none ${
                    isOutbound
                      ? "[&_*]:text-white [&_a]:text-indigo-200"
                      : ""
                  }`}
                  dangerouslySetInnerHTML={{ __html: email.htmlBody || email.textBody || "" }}
                />

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {email.attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 ${
                          isOutbound ? "bg-indigo-500/50 text-indigo-100" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        <Paperclip className="h-3 w-3" />
                        {att.filename}
                      </span>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-[10px] mt-2 ${isOutbound ? "text-indigo-300" : "text-gray-400"}`}>
                  {email.sender?.name && isOutbound ? `${email.sender.name} · ` : ""}
                  {format(new Date(email.createdAt), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply area */}
      {!showCompose ? (
        <div className="border-t border-gray-200 pt-4">
          <Button onClick={() => setShowCompose(true)} className="w-full">
            <Send className="h-4 w-4 mr-2" /> Reply to {client.firstName}
          </Button>
        </div>
      ) : (
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="text-sm"
          />

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <CKEditorWrapper onChange={(html) => { editorContentRef.current = html; }} />
          </div>

          {/* Attachments */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4 mr-1" /> Attach
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS}
              multiple
              onChange={handleFileAdd}
              className="hidden"
            />
            {attachments.map((file, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs rounded-md px-2 py-1">
                <Paperclip className="h-3 w-3" />
                {file.name}
                <span className="text-gray-400">({formatSize(file.size)})</span>
                <button onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowCompose(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-1" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
