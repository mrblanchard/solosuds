"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const schema = z.object({
  clientId: z.string().min(1, "Client is required"),
  practitionerId: z.string().min(1, "Practitioner is required"),
  serviceId: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().max(5000, "Notes are too long").optional(),
  sendReminder: z.boolean().optional(),
}).refine((d) => !d.startTime || !d.endTime || new Date(d.endTime) > new Date(d.startTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});

type FormValues = z.infer<typeof schema>;

interface AppointmentFormProps {
  clients: { id: string; firstName: string; lastName: string }[];
  practitioners: { id: string; name: string | null }[];
  services: { id: string; name: string; durationMinutes: number }[];
  defaultStartTime?: string;
  defaultClientId?: string;
  appointmentId?: string;
  defaultValues?: Partial<FormValues>;
}

export default function AppointmentForm({
  clients,
  practitioners,
  services,
  defaultStartTime,
  defaultClientId,
  appointmentId,
  defaultValues,
}: AppointmentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      clientId: defaultClientId ?? defaultValues?.clientId ?? "",
      startTime: defaultStartTime ?? defaultValues?.startTime ?? "",
      endTime: defaultValues?.endTime ?? "",
      sendReminder: true,
    },
  });

  const startTime = watch("startTime");
  const serviceId = watch("serviceId");

  // Auto-calculate end time when service changes
  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sid = e.target.value;
    setValue("serviceId", sid);
    if (sid && startTime) {
      const service = services.find((s) => s.id === sid);
      if (service) {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + service.durationMinutes * 60000);
        setValue("endTime", end.toISOString().slice(0, 16));
      }
    }
  }

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const url = appointmentId
        ? `/api/appointments/${appointmentId}`
        : "/api/appointments";
      const method = appointmentId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("Appointment save failed:", res.status, errBody);
        alert(`Failed to save appointment (${res.status}): ${errBody?.error ?? "Unknown error"}`);
        setIsLoading(false);
        return;
      }
      const appt = await res.json();
      router.push(`/dashboard/schedule/${appt.id}`);
      router.refresh();
    } catch (err) {
      console.error("Appointment save error:", err);
      alert("Failed to save appointment. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="clientId">Client *</Label>
          <select
            id="clientId"
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
          <Label htmlFor="practitionerId">Practitioner *</Label>
          <select
            id="practitionerId"
            {...register("practitionerId")}
            className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select practitioner…</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.practitionerId && (
            <p className="mt-1 text-xs text-red-500">{errors.practitionerId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="serviceId">Service</Label>
          <select
            id="serviceId"
            {...register("serviceId")}
            onChange={handleServiceChange}
            className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No specific service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <input
            id="startTime"
            type="datetime-local"
            {...register("startTime")}
            className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.startTime && (
            <p className="mt-1 text-xs text-red-500">{errors.startTime.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <input
            id="endTime"
            type="datetime-local"
            {...register("endTime")}
            className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.endTime && (
            <p className="mt-1 text-xs text-red-500">{errors.endTime.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (internal)</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Any notes about this appointment…"
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="sendReminder"
            {...register("sendReminder")}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Label htmlFor="sendReminder" className="font-normal">
            Send email reminder to client (24 hours before)
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {appointmentId ? "Update Appointment" : "Book Appointment"}
        </Button>
      </div>
    </form>
  );
}
