"use client";

import { useState } from "react";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

interface Field {
  id: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "heading";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string;
}

interface Props {
  formId: string;
  fields: Field[];
}

export default function PublicIntakeForm({ formId, fields }: Props) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(id: string, value: string | boolean) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side required validation
    const missing = fields.filter(
      (f) => f.type !== "heading" && f.required && !values[f.id]
    );
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/intake-forms/${formId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: values }),
    });
    setSubmitting(false);

    if (res.ok) {
      setSubmitted(true);
    } else {
      const json = await res.json();
      setError(json.error ?? "Failed to submit. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center shadow-sm">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Form Submitted!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Thank you. We&apos;ll see you at your appointment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {fields.map((field) => {
        if (field.type === "heading") {
          return (
            <h3 key={field.id} className="text-base font-semibold text-gray-900 pt-2">
              {field.label}
            </h3>
          );
        }

        const selectOptions = field.options?.split("\n").filter(Boolean) ?? [];

        return (
          <div key={field.id}>
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.type === "text" && (
              <Input
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1"
              />
            )}
            {field.type === "textarea" && (
              <Textarea
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1"
              />
            )}
            {field.type === "date" && (
              <DateWheelPicker
                value={(values[field.id] as string) ?? ""}
                onChange={(v) => set(field.id, v)}
              />
            )}
            {field.type === "select" && (
              <select
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select an option…</option>
                {selectOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {field.type === "checkbox" && (
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={(values[field.id] as boolean) ?? false}
                  onChange={(e) => set(field.id, e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                {field.placeholder || "Yes"}
              </label>
            )}
          </div>
        );
      })}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Form"}
      </Button>
    </form>
  );
}
