"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

interface DuplicateFormButtonProps {
  formId: string;
  onDuplicated: (newForm: {
    id: string;
    title: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    _count: { submissions: number };
  }) => void;
}

export default function DuplicateFormButton({
  formId,
  onDuplicated,
}: DuplicateFormButtonProps) {
  const [duplicating, setDuplicating] = useState(false);

  async function duplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/intake-forms/${formId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      const newForm = await res.json();
      onDuplicated(newForm);
    } catch (error) {
      console.error("Failed to duplicate form:", error);
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <button
      onClick={duplicate}
      disabled={duplicating}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
    >
      <Copy className="h-3.5 w-3.5" />
      {duplicating ? "Copying…" : "Copy"}
    </button>
  );
}
