"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2, FileText, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Doc {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  direction: "CLIENT_TO_PRACTICE" | "PRACTICE_TO_CLIENT";
  createdAt: string | Date;
}

interface Props {
  orgSlug: string;
  initialDocs: Doc[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalFiles({ orgSlug, initialDocs }: Props) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/portal/documents", { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const json = await res.json();
      setUploadError(json.error ?? "Upload failed. Please try again.");
      return;
    }

    // Refresh list
    const listRes = await fetch("/api/portal/documents");
    if (listRes.ok) setDocs(await listRes.json());
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    const res = await fetch(`/api/portal/documents/${id}`);
    setDownloadingId(null);

    if (!res.ok) return;
    const { url, name } = await res.json();

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/portal/documents/${id}`, { method: "DELETE" });
    setDeletingId(null);

    if (res.ok) setDocs((d) => d.filter((doc) => doc.id !== id));
  }

  const fromClient = docs.filter((d) => d.direction === "CLIENT_TO_PRACTICE");
  const fromPractice = docs.filter((d) => d.direction === "PRACTICE_TO_CLIENT");

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Upload a document</h2>
            <p className="text-xs text-gray-500 mt-0.5">PDF, images, Word docs — up to 25 MB</p>
          </div>
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {uploading ? "Uploading…" : "Choose file"}
          </Button>
        </div>

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
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}
      </div>

      {/* Documents shared by practice */}
      {fromPractice.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownToLine className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-900">Shared with you</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {fromPractice.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                downloading={downloadingId === doc.id}
                deleting={false}
                canDelete={false}
                onDownload={() => handleDownload(doc.id)}
                onDelete={() => {}}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Documents you uploaded */}
      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpFromLine className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-semibold text-gray-900">Your uploaded documents</h2>
        </div>
        {fromClient.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {fromClient.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                downloading={downloadingId === doc.id}
                deleting={deletingId === doc.id}
                canDelete
                onDownload={() => handleDownload(doc.id)}
                onDelete={() => handleDelete(doc.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DocRow({
  doc,
  downloading,
  deleting,
  canDelete,
  onDownload,
  onDelete,
}: {
  doc: Doc;
  downloading: boolean;
  deleting: boolean;
  canDelete: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
          <p className="text-xs text-gray-400">
            {formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt, "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDownload}
          disabled={downloading}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            disabled={deleting}
            title="Delete"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
