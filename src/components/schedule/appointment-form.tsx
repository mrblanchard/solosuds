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
  clientId: z.string().optional(),
  clientName: z.string().max(200).optional(),
  serviceId: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().max(5000, "Notes are too long").optional(),
  sendReminder: z.boolean().optional(),
  recurrence: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
}).refine((d) => !d.startTime || !d.endTime || new Date(d.endTime) > new Date(d.startTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});

type FormValues = z.infer<typeof schema>;

interface AppointmentFormProps {
  clients: { id: string; firstName: string; lastName: string }[];
  services: { id: string; name: string; durationMinutes: number }[];
  currentUserId: string;
  defaultStartTime?: string;
  defaultClientId?: string;
  appointmentId?: string;
  defaultValues?: Partial<FormValues>;
}

export default function AppointmentForm({
  clients,
  services,
  currentUserId,
  defaultStartTime,
  defaultClientId,
  appointmentId,
  defaultValues,
}: AppointmentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // "existing" = select from list, "new" = type a name
  const [clientMode, setClientMode] = useState<"existing" | "new">(
    defaultClientId ? "existing" : "new"
  );

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
      recurrence: "NONE",
    },
  });

  const startTime = watch("startTime");

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

      // Send clientId if mode is "existing", clientName if mode is "new"
      const payload = {
        ...data,
        clientId: clientMode === "existing" ? data.clientId || undefined : undefined,
        clientName: clientMode === "new" ? data.clientName || undefined : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("Appointment save failed:", res.status, errBody);
        alert(`Failed to save appointment (${res.status}): ${errBody?.error ?? "Unknown error"}`);
        setIsLoading(false);
        return;
      }
      const appt = await res.json();
      if (appt.skippedOccurrences > 0) {
        alert(
          `Booked. ${appt.skippedOccurrences} future occurrence(s) were skipped because that time slot was already taken, you can add those manually.`
        );
      }
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
      {/* Hidden practitioner — auto-assigned to current user */}
      <input type="hidden" value={currentUserId} {...register("clientId", { shouldUnregister: false })} name="__practitionerId_unused" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Client field */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="client-input">
              Client <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </Label>
            {clients.length > 0 && (
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={`transition-colors ${clientMode === "new" ? "text-indigo-600 font-medium" : "text-gray-400 hover:text-gray-600"}`}
                >
                  New client
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`transition-colors ${clientMode === "existing" ? "text-indigo-600 font-medium" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Existing client
                </button>
              </div>
            )}
          </div>

          {clientMode === "existing" && clients.length > 0 ? (
            <select
              id="client-input"
              {...register("clientId")}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="client-input"
              type="text"
              {...register("clientName")}
              placeholder="e.g. Sarah Johnson"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          {(errors.clientId || errors.clientName) && (
            <p className="mt-1 text-xs text-red-500">
              {errors.clientId?.message ?? errors.clientName?.message}
            </p>
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

        {!appointmentId && (
          <div>
            <Label htmlFor="recurrence">Repeat</Label>
            <select
              id="recurrence"
              {...register("recurrence")}
              className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NONE">Does not repeat</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Every 2 weeks</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        )}

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
