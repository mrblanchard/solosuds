"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Sparkles,
  Save,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";

const soapSchema = z.object({
  subjective: z.string().min(1, "Subjective is required"),
  objective: z.string().optional(),
  assessment: z.string().min(1, "Assessment is required"),
  plan: z.string().min(1, "Plan is required"),
  diagnosisCodes: z.string().optional(),
  procedureCodes: z.string().optional(),
});

type SoapFormValues = z.infer<typeof soapSchema>;

interface SoapNoteEditorProps {
  noteId: string;
  initialData: Partial<SoapFormValues & { status: string; transcript?: string }>;
  clientName: string;
}

export function SoapNoteEditor({
  noteId,
  initialData,
  clientName,
}: SoapNoteEditorProps) {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState(initialData.transcript ?? "");
  const [showTranscript, setShowTranscript] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  // ── Voice Recording ────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleTranscription(blob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch {
      alert("Microphone access is required for voice recording.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  }

  async function handleTranscription(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      setTranscript(data.transcript);
      setShowTranscript(true);
    } catch {
      alert("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  }

  // ── AI SOAP Generation ─────────────────────────────────────────────────────

  async function generateFromTranscript() {
    if (!transcript) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, noteId }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();

      setValue("subjective", data.subjective, { shouldDirty: true });
      setValue("objective", data.objective, { shouldDirty: true });
      setValue("assessment", data.assessment, { shouldDirty: true });
      setValue("plan", data.plan, { shouldDirty: true });
    } catch {
      alert("AI generation failed. Please fill in the fields manually.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Save / Sign ────────────────────────────────────────────────────────────

  async function onSave(data: SoapFormValues, action: "save" | "sign") {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, transcript, action }),
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
      {/* AI Scribe toolbar */}
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
        <p className="text-sm text-indigo-700 flex-1">
          <strong>AI Scribe:</strong> Record the session, then let AI populate the SOAP sections.
        </p>
        <div className="flex items-center gap-2">
          {isTranscribing ? (
            <Button type="button" variant="outline" size="sm" disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              Transcribing…
            </Button>
          ) : isRecording ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
            >
              <MicOff className="h-4 w-4 mr-1" />
              Stop Recording
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
              disabled={isLocked}
            >
              <Mic className="h-4 w-4 mr-1" />
              Record Session
            </Button>
          )}

          {transcript && (
            <Button
              type="button"
              size="sm"
              onClick={generateFromTranscript}
              disabled={isGenerating || isLocked}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Generate SOAP
            </Button>
          )}
        </div>
      </div>

      {/* Transcript collapsible */}
      {transcript && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-gray-400" />
              Session Transcript
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(transcript);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Copy className="h-4 w-4" />
              </button>
              {showTranscript ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
          {showTranscript && (
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">
                {transcript}
              </p>
            </div>
          )}
        </div>
      )}

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
