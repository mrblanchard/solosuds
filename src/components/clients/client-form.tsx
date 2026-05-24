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
import { AddressAutocomplete, type ParsedAddress } from "@/components/ui/address-autocomplete";
import { formatPhone, stripPhone, titleCase, normalizeEmail, formatZip, normalizeWhitespace } from "@/lib/utils";

const optionalPhone = z.string().regex(/^[+]?[\d-]{7,20}$/, "Invalid phone number").or(z.literal("")).optional();

const schema = z.object({
  firstName: z.string().min(1, "First name is required").max(100, "First name is too long"),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name is too long"),
  email: z.string().email("Invalid email").max(254).optional().or(z.literal("")),
  phone: optionalPhone,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format").or(z.literal("")).optional(),
  gender: z.string().max(50).optional(),
  pronouns: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().regex(/^[A-Za-z0-9\s-]{3,10}$/, "Invalid postal code").or(z.literal("")).optional(),
  country: z.string().max(100).optional(),
  emergencyName: z.string().max(200).optional(),
  emergencyPhone: optionalPhone,
  referralSource: z.string().max(200).optional(),
  internalNotes: z.string().max(5000).optional(),
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

  async function onSubmit(raw: FormValues) {
    setIsLoading(true);
    const data = {
      ...raw,
      firstName: normalizeWhitespace(raw.firstName),
      lastName: normalizeWhitespace(raw.lastName),
      email: raw.email ? normalizeEmail(raw.email) : raw.email,
      phone: raw.phone ? stripPhone(raw.phone) : raw.phone,
      emergencyPhone: raw.emergencyPhone ? stripPhone(raw.emergencyPhone) : raw.emergencyPhone,
      emergencyName: raw.emergencyName ? normalizeWhitespace(raw.emergencyName) : raw.emergencyName,
    };
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
            <Input
              {...register("firstName")}
              placeholder="Jane"
              onBlur={(e) => setValue("firstName", titleCase(e.target.value.trim()))}
            />
          </FormField>
          <FormField label="Last Name *" error={errors.lastName?.message}>
            <Input
              {...register("lastName")}
              placeholder="Smith"
              onBlur={(e) => setValue("lastName", titleCase(e.target.value.trim()))}
            />
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
            <Input
              type="email"
              {...register("email")}
              placeholder="jane@example.com"
              onBlur={(e) => setValue("email", normalizeEmail(e.target.value))}
            />
          </FormField>
          <FormField label="Phone">
            <Input
              type="tel"
              value={watch("phone") ?? ""}
              onChange={(e) => setValue("phone", formatPhone(e.target.value))}
              placeholder="802-258-0000"
            />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <AddressAutocomplete
              value={watch("address") ?? ""}
              onChange={(v) => setValue("address", v)}
              onSelect={(parsed: ParsedAddress) => {
                setValue("address", parsed.address);
                setValue("city", parsed.city);
                setValue("state", parsed.state);
                setValue("zip", parsed.zip, { shouldValidate: true });
                setValue("country", parsed.country);
              }}
              placeholder="Start typing an address…"
            />
          </FormField>
          <FormField label="City">
            <Input {...register("city")} placeholder="New York" />
          </FormField>
          <FormField label="State">
            <Input {...register("state")} placeholder="NY" />
          </FormField>
          <FormField label="ZIP Code">
            <Input
              value={watch("zip") ?? ""}
              onChange={(e) => setValue("zip", formatZip(e.target.value))}
              placeholder="10001"
            />
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
            <Input
              {...register("emergencyName")}
              placeholder="John Smith"
              onBlur={(e) => setValue("emergencyName", titleCase(e.target.value.trim()))}
            />
          </FormField>
          <FormField label="Phone">
            <Input
              type="tel"
              value={watch("emergencyPhone") ?? ""}
              onChange={(e) => setValue("emergencyPhone", formatPhone(e.target.value))}
              placeholder="802-258-0000"
            />
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
