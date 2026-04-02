"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  referralSource: z.string().optional(),
  internalNotes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClientFormProps {
  defaultValues?: Partial<FormValues>;
  clientId?: string;
}

export function ClientForm({ defaultValues, clientId }: ClientFormProps) {
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
    defaultValues: defaultValues ?? { country: "US" },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const url = clientId ? `/api/clients/${clientId}` : "/api/clients";
      const method = clientId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Save failed");
      const client = await res.json();
      router.push(`/dashboard/clients/${client.id}`);
      router.refresh();
    } catch {
      alert("Failed to save client. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="First Name *" error={errors.firstName?.message}>
            <Input {...register("firstName")} placeholder="Jane" />
          </FormField>
          <FormField label="Last Name *" error={errors.lastName?.message}>
            <Input {...register("lastName")} placeholder="Smith" />
          </FormField>
          <FormField label="Date of Birth" error={errors.dateOfBirth?.message}>
            <DateWheelPicker
              value={watch("dateOfBirth") ?? ""}
              onChange={(v) => setValue("dateOfBirth", v, { shouldValidate: true })}
            />
          </FormField>
          <FormField label="Gender">
            <Input {...register("gender")} placeholder="e.g. Female, Male, Non-binary" />
          </FormField>
          <FormField label="Pronouns">
            <Input {...register("pronouns")} placeholder="e.g. she/her, they/them" />
          </FormField>
          <FormField label="Referral Source">
            <Input {...register("referralSource")} placeholder="e.g. Google, Friend" />
          </FormField>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} placeholder="jane@example.com" />
          </FormField>
          <FormField label="Phone">
            <Input type="tel" {...register("phone")} placeholder="+1 (555) 000-0000" />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <Input {...register("address")} placeholder="123 Main St" />
          </FormField>
          <FormField label="City">
            <Input {...register("city")} placeholder="New York" />
          </FormField>
          <FormField label="State">
            <Input {...register("state")} placeholder="NY" />
          </FormField>
          <FormField label="ZIP Code">
            <Input {...register("zip")} placeholder="10001" />
          </FormField>
          <FormField label="Country">
            <Input {...register("country")} placeholder="US" />
          </FormField>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name">
            <Input {...register("emergencyName")} placeholder="John Smith" />
          </FormField>
          <FormField label="Phone">
            <Input type="tel" {...register("emergencyPhone")} placeholder="+1 (555) 000-0000" />
          </FormField>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("internalNotes")}
            placeholder="Internal staff notes (not visible to client)…"
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {clientId ? "Save Changes" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}

function FormField({
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
