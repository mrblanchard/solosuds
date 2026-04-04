"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  formId: string;
  formTitle: string;
  /** Render as a full button with text instead of icon-only */
  variant?: "icon" | "button";
}

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirming,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        role="alertdialog"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-delete-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id="confirm-delete-desc" className="mt-2 text-sm text-gray-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={confirming}>
            No, cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirming}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {confirming ? "Deleting…" : "Yes, delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DeleteFormButton({ formId, formTitle, variant = "icon" }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    const res = await fetch(`/api/intake-forms/${formId}`, { method: "DELETE" });
    if (res.ok) {
      setShowConfirm(false);
      setDeleting(false);
      router.push("/dashboard/intake");
      router.refresh();
    } else {
      setDeleting(false);
      setShowConfirm(false);
      alert("Failed to delete form");
    }
  }

  return (
    <>
      {variant === "button" ? (
        <Button
          variant="outline"
          onClick={() => setShowConfirm(true)}
          disabled={deleting}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "Deleting…" : "Delete Form"}
        </Button>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={deleting}
          className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Delete form"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Delete intake form?"
          message={`Are you sure you want to delete "${formTitle}"? This will also delete all submissions. This action cannot be undone.`}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          confirming={deleting}
        />
      )}
    </>
  );
}
