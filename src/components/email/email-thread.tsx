"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Paperclip, X, Archive, Trash2, ShieldCheck, ShieldOff, Clock, RotateCcw } from "lucide-react";

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
  emailConsentStatus: "NONE" | "PENDING" | "CONSENTED" | "REVOKED";
}

interface Props {
  client: ClientInfo;
  emails: EmailMessage[];
  consentFormId: string | null;
}

const ALLOWED_EXTENSIONS = ".pdf,.csv,.xlsx,.xls,.zip,.png,.jpg,.jpeg,.gif,.webp";

export default function EmailThread({ client, emails, consentFormId }: Props) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [consentStatus, setConsentStatus] = useState(client.emailConsentStatus);
  const [sendingConsent, setSendingConsent] = useState(false);
  const [revoking, setRevoking] = useState(false);

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

  async function handleArchive() {
    setArchiving(true);
    await fetch(`/api/emails?clientId=${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    setArchiving(false);
    router.push("/dashboard/email");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete all emails with ${client.firstName} ${client.lastName}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/emails?clientId=${client.id}`, { method: "DELETE" });
    setDeleting(false);
    router.push("/dashboard/email");
    router.refresh();
  }

  async function handleSendConsent() {
    if (!client.email) {
      setError("Client has no email address on file.");
      return;
    }
    setSendingConsent(true);
    setError(null);
    const res = await fetch(`/api/clients/${client.id}/email-consent`, { method: "POST" });
    setSendingConsent(false);
    if (res.ok) {
      setConsentStatus("PENDING");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to send consent form");
    }
  }

  async function handleRevokeConsent() {
    if (!confirm(`Revoke email access for ${client.firstName} ${client.lastName}? They will need to re-consent before you can email them again.`)) return;
    setRevoking(true);
    const res = await fetch(`/api/clients/${client.id}/email-consent`, { method: "DELETE" });
    setRevoking(false);
    if (res.ok) {
      setConsentStatus("REVOKED");
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
          aria-label="Back to inbox"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">{clientName}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-500">{client.email}</p>
            {consentStatus === "CONSENTED" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <ShieldCheck className="h-3 w-3" /> Email Consented
              </span>
            )}
            {consentStatus === "PENDING" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Clock className="h-3 w-3" /> Consent Pending
              </span>
            )}
            {consentStatus === "REVOKED" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                <ShieldOff className="h-3 w-3" /> Email Revoked
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consentStatus === "CONSENTED" && (
            <button
              onClick={handleRevokeConsent}
              disabled={revoking}
              title="Revoke email consent"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition-colors"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              {revoking ? "Revoking…" : "Revoke Access"}
            </button>
          )}
          <button
            onClick={handleArchive}
            disabled={archiving}
            title="Archive conversation"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-amber-100 hover:text-amber-700 disabled:opacity-50 transition-colors"
          >
            <Archive className="h-3.5 w-3.5" />
            {archiving ? "Archiving…" : "Archive"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete conversation"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
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

      {/* Consent gate / Reply area */}
      {consentStatus !== "CONSENTED" ? (
        <div className="border-t border-gray-200 pt-6">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {consentStatus === "NONE" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Email consent required</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Before you can email {client.firstName}, they need to consent to receiving emails from your practice.
                    A consent form will be emailed to them at <strong>{client.email ?? "their email address"}</strong>.
                    Once they sign it, email communication will be unlocked.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSendConsent}
                disabled={sendingConsent || !client.email}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
                {sendingConsent ? "Sending consent form…" : "Send Consent Form"}
              </button>
              {!client.email && (
                <p className="text-xs text-red-600">This client has no email address on file. Add one in their profile first.</p>
              )}
            </div>
          )}
          {consentStatus === "PENDING" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Waiting for consent</p>
                  <p className="text-xs text-blue-800 mt-1">
                    A consent form was sent to <strong>{client.email}</strong>. Email communication will be unlocked once {client.firstName} signs it.
                    You can resend the form if they haven&apos;t received it.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSendConsent}
                disabled={sendingConsent}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                {sendingConsent ? "Resending…" : "Resend Consent Form"}
              </button>
            </div>
          )}
          {consentStatus === "REVOKED" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldOff className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Email access revoked</p>
                  <p className="text-xs text-red-800 mt-1">
                    Email communication with {client.firstName} has been disabled. To re-enable it,
                    send a new consent form for them to sign.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSendConsent}
                disabled={sendingConsent || !client.email}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
                {sendingConsent ? "Sending…" : "Send New Consent Form"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Normal reply area — only shown when CONSENTED */
        <>
          {!showCompose ? (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <strong>Notice:</strong> Standard email is not end-to-end encrypted. Only send non-sensitive scheduling information, or ensure your client has consented to email communication.
              </p>
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
                    <button onClick={() => removeAttachment(idx)} aria-label="Remove attachment" className="text-gray-400 hover:text-red-500">
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
        </>
      )}
    </div>
  );
}
