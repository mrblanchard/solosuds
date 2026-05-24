"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { Loader2 } from "lucide-react";

const schema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  sessionDate: z.string().min(1, "Session date is required"),
  templateId: z.string().optional(),
  appointmentId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface NewNoteFormProps {
  clients: { id: string; firstName: string; lastName: string }[];
  templates: { id: string; name: string }[];
  defaultClientId?: string;
  defaultAppointmentId?: string;
  duplicateFromId?: string;
}

export function NewNoteForm({
  clients,
  templates,
  defaultClientId,
  defaultAppointmentId,
  duplicateFromId,
}: NewNoteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: defaultClientId ?? "",
      sessionDate: new Date().toISOString().split("T")[0],
      appointmentId: defaultAppointmentId ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, duplicateFromId }),
      });

      if (!res.ok) throw new Error("Failed to create note");
      const note = await res.json();
      router.push(`/dashboard/notes/${note.id}`);
    } catch {
      alert("Failed to create note. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="clientId">Client *</Label>
        <select
          {...register("clientId")}
          className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        {errors.clientId && (
          <p className="mt-1 text-xs text-red-500">{errors.clientId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="sessionDate">Session Date *</Label>
        <DateWheelPicker
          value={watch("sessionDate") ?? ""}
          onChange={(v) => setValue("sessionDate", v, { shouldValidate: true })}
        />
        {errors.sessionDate && (
          <p className="mt-1 text-xs text-red-500">{errors.sessionDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="templateId">Template (optional)</Label>
        <select
          {...register("templateId")}
          className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">No template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {duplicateFromId && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-700">
          This note will be pre-filled from the previous session's content.
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Start Note
      </Button>
    </form>
  );
}
