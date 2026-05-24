"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  FileText,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  direction: "CLIENT_TO_PRACTICE" | "PRACTICE_TO_CLIENT";
  uploadedBy: string | null;
  createdAt: string | Date;
}

interface Props {
  clientId: string;
  orgSlug: string;
  initialDocs: Document[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDocuments({ clientId, orgSlug, initialDocs }: Props) {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${orgSlug}`;

  async function copyPortalLink() {
    await navigator.clipboard.writeText(portalUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/clients/${clientId}/documents`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);

    if (!res.ok) {
      const json = await res.json();
      setUploadError(json.error ?? "Upload failed.");
      return;
    }

    const listRes = await fetch(`/api/clients/${clientId}/documents`);
    if (listRes.ok) setDocs(await listRes.json());
  }

  async function handleDownload(docId: string) {
    setDownloadingId(docId);
    const res = await fetch(`/api/clients/${clientId}/documents/${docId}`);
    setDownloadingId(null);
    if (!res.ok) return;
    const { url, name } = await res.json();
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(docId);
    const res = await fetch(`/api/clients/${clientId}/documents/${docId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) setDocs((d) => d.filter((doc) => doc.id !== docId));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-gray-500" />
            Documents
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyPortalLink}>
              {linkCopied ? (
                <><Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />Copied!</>
              ) : (
                <><LinkIcon className="h-3.5 w-3.5 mr-1.5" />Copy portal link</>
              )}
            </Button>
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {uploading ? "Uploading…" : "Share file"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.tiff,.heic,.txt,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />

        {uploadError && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {docs.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            <FolderOpen className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            No documents yet. Use &ldquo;Share file&rdquo; to send a document to this client, or
            send them the portal link so they can upload to you.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(doc.sizeBytes)} ·{" "}
                      {formatDate(doc.createdAt, "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant={doc.direction === "CLIENT_TO_PRACTICE" ? "secondary" : "outline"}
                    className="shrink-0 text-xs"
                  >
                    {doc.direction === "CLIENT_TO_PRACTICE" ? "From client" : "Shared with client"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc.id)}
                    disabled={downloadingId === doc.id}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    title="Delete"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
