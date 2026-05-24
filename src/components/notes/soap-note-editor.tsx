"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle, Loader2 } from "lucide-react";

const soapSchema = z.object({
  subjective: z.string().min(1, "Subjective is required").max(50000, "Text is too long"),
  objective: z.string().max(50000, "Text is too long").optional(),
  assessment: z.string().min(1, "Assessment is required").max(50000, "Text is too long"),
  plan: z.string().min(1, "Plan is required").max(50000, "Text is too long"),
  diagnosisCodes: z.string().max(500, "Too many codes").optional(),
  procedureCodes: z.string().max(500, "Too many codes").optional(),
});

type SoapFormValues = z.infer<typeof soapSchema>;

interface SoapNoteEditorProps {
  noteId: string;
  initialData: Partial<SoapFormValues & { status: string }>;
  clientName: string;
}

export function SoapNoteEditor({
  noteId,
  initialData,
  clientName,
}: SoapNoteEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SoapFormValues>({
    resolver: zodResolver(soapSchema),
    defaultValues: {
      subjective: initialData.subjective ?? "",
      objective: initialData.objective ?? "",
      assessment: initialData.assessment ?? "",
      plan: initialData.plan ?? "",
      diagnosisCodes: initialData.diagnosisCodes ?? "",
      procedureCodes: initialData.procedureCodes ?? "",
    },
  });

  const isLocked = initialData.status === "LOCKED";

  // ── Save / Sign ────────────────────────────────────────────────────────────

  async function onSave(data: SoapFormValues, action: "save" | "sign") {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action }),
      });

      if (!res.ok) throw new Error("Save failed");
      router.refresh();
      if (action === "sign") router.push("/dashboard/notes");
    } catch {
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit((d) => onSave(d, "save"))} className="space-y-6">
      {/* SOAP Sections */}
      <div className="grid grid-cols-1 gap-6">
        {soapSections.map(({ key, label, description, color }) => (
          <div key={key} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className={`flex items-center gap-3 border-b border-gray-100 px-6 py-3 ${color}`}>
              <span className="text-lg font-bold">
                {key.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
            <div className="p-4">
              <Textarea
                {...register(key as keyof SoapFormValues)}
                placeholder={`Enter ${label.toLowerCase()} notes…`}
                className="min-h-[120px] border-0 focus:ring-0 p-0 resize-none text-sm leading-relaxed"
                disabled={isLocked}
              />
              {errors[key as keyof SoapFormValues] && (
                <p className="mt-1 text-xs text-red-500">
                  {errors[key as keyof SoapFormValues]?.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Billing codes */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Billing Codes</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ICD-10 Diagnosis Codes</Label>
            <input
              {...register("diagnosisCodes")}
              placeholder="e.g. M54.5, F32.1"
              className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLocked}
            />
            <p className="mt-1 text-xs text-gray-400">Comma-separated</p>
          </div>
          <div>
            <Label>CPT Procedure Codes</Label>
            <input
              {...register("procedureCodes")}
              placeholder="e.g. 97110, 90837"
              className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLocked}
            />
            <p className="mt-1 text-xs text-gray-400">Comma-separated</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isLocked && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="warning">Unsaved changes</Badge>
            )}
            {initialData.status === "SIGNED" && (
              <Badge variant="success">Signed</Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((d) => onSave(d, "sign"))}
              disabled={isSaving}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Sign & Lock
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

const soapSections = [
  {
    key: "subjective",
    label: "Subjective",
    description: "Patient-reported: symptoms, complaints, history, goals",
    color: "bg-blue-50",
  },
  {
    key: "objective",
    label: "Objective",
    description: "Measurable findings: vitals, range of motion, test results",
    color: "bg-green-50",
  },
  {
    key: "assessment",
    label: "Assessment",
    description: "Clinical interpretation, diagnosis, progress evaluation",
    color: "bg-yellow-50",
  },
  {
    key: "plan",
    label: "Plan",
    description: "Treatment plan, interventions, homework, follow-up",
    color: "bg-purple-50",
  },
];
