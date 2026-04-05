"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, X, Send } from "lucide-react";

const CKEditorWrapper = dynamic(
  () => import("@/components/email/ckeditor-wrapper"),
  { ssr: false, loading: () => <div className="h-[250px] bg-gray-50 animate-pulse rounded" /> }
);

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Props {
  clients: ClientOption[];
  replyTo?: {
    clientId: string;
    toEmail: string;
    subject: string;
  };
}

const ALLOWED_EXTENSIONS = ".pdf,.csv,.xlsx,.xls,.zip,.png,.jpg,.jpeg,.gif,.webp";

export default function ComposeEmail({ clients, replyTo }: Props) {
  const router = useRouter();
  const editorContentRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedClientId, setSelectedClientId] = useState(replyTo?.clientId ?? "");
  const [toEmail, setToEmail] = useState(replyTo?.toEmail ?? "");
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject.replace(/^Re: /i, "")}` : "");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill email when client selected
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client?.email) setToEmail(client.email);
    }
  }, [selectedClientId, clients]);

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
    if (!toEmail || !subject || !htmlBody.trim()) {
      setError("Email address, subject, and body are required");
      return;
    }

    setSending(true);
    setError(null);

    const formData = new FormData();
    if (selectedClientId) formData.append("clientId", selectedClientId);
    formData.append("toEmail", toEmail);
    formData.append("subject", subject);
    formData.append("htmlBody", htmlBody);
    for (const file of attachments) {
      formData.append("attachments", file);
    }

    const res = await fetch("/api/emails", { method: "POST", body: formData });
    setSending(false);

    if (res.ok) {
      router.push("/dashboard/email");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to send email");
    }
  }

  return (
    <div className="space-y-4">
      {/* Client selector */}
      <div>
        <Label htmlFor="client">Client</Label>
        <select
          id="client"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        >
          <option value="">— Select a client (optional) —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* To email */}
      <div>
        <Label htmlFor="toEmail">To</Label>
        <Input
          id="toEmail"
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="mt-1"
        />
      </div>

      {/* Subject */}
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          className="mt-1"
        />
      </div>

      {/* Rich text editor */}
      <div>
        <Label>Message</Label>
        <div className="mt-1 border border-gray-200 rounded-md overflow-hidden">
          <CKEditorWrapper
            onChange={(html) => { editorContentRef.current = html; }}
          />
        </div>
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-1" /> Attach Files
          </Button>
          <span className="text-xs text-gray-400">PDF, CSV, XLSX, ZIP, Images (max 10MB each)</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          multiple
          onChange={handleFileAdd}
          className="hidden"
        />
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 rounded-md px-3 py-1.5">
                <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-gray-400 shrink-0">({formatSize(file.size)})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="ml-auto text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Send */}
      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={sending}>
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Sending…" : "Send Email"}
        </Button>
      </div>
    </div>
  );
}
