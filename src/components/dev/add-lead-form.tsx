"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

const schema = z.object({
  business: z.string().min(1, "Business name is required").max(200),
  contact: z.string().max(200).optional().or(z.literal("")),
  email: z.string().email("Invalid email").max(254).optional().or(z.literal("")),
  phone: z.string().regex(/^[+]?[\d\s()-]{7,20}$/, "Invalid phone number").optional().or(z.literal("")),
  website: z.string().max(300).optional().or(z.literal("")),
  location: z.string().min(1, "Location is required").max(200),
  software: z.enum(["Fullslate", "Acuity", "MassageBook", "Square", "Mindbody", "None visible", "Unknown"]),
  talkingPoint: z.string().max(1000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function AddLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { software: "Unknown" },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/dev/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.formErrors?.[0] ?? "Failed to save lead.");
      }
      reset({ software: "Unknown" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save lead.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add lead
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business name *" error={errors.business?.message}>
          <Input {...register("business")} placeholder="e.g. Green Mountain Massage" />
        </Field>
        <Field label="Contact name" error={errors.contact?.message}>
          <Input {...register("contact")} placeholder="e.g. Jane Smith" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} placeholder="jane@example.com" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input type="tel" {...register("phone")} placeholder="(802) 555-0100" />
        </Field>
        <Field label="Location *" error={errors.location?.message}>
          <Input {...register("location")} placeholder="e.g. Brattleboro, VT" />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <Input {...register("website")} placeholder="e.g. greenmountainmassage.com" />
        </Field>
        <Field label="Current software" error={errors.software?.message}>
          <select
            {...register("software")}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="Unknown">Unknown</option>
            <option value="None visible">None visible</option>
            <option value="Fullslate">Fullslate</option>
            <option value="Acuity">Acuity</option>
            <option value="MassageBook">MassageBook</option>
            <option value="Square">Square</option>
            <option value="Mindbody">Mindbody</option>
          </select>
        </Field>
        <Field label="Talking point" error={errors.talkingPoint?.message} className="sm:col-span-2">
          <Input {...register("talkingPoint")} placeholder="What to open with on a call" />
        </Field>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save lead
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
