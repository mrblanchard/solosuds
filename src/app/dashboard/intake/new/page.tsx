"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Field {
  id: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "heading";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string;
}

interface FormData {
  title: string;
  description: string;
  fields: Field[];
}

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "heading", label: "Section heading" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NewIntakeFormPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    fields: [],
  });

  function addField(type: Field["type"]) {
    setFormData((f) => ({
      ...f,
      fields: [
        ...f.fields,
        { id: generateId(), type, label: "", required: false },
      ],
    }));
  }

  function updateField(id: string, changes: Partial<Field>) {
    setFormData((f) => ({
      ...f,
      fields: f.fields.map((field) =>
        field.id === id ? { ...field, ...changes } : field
      ),
    }));
  }

  function removeField(id: string) {
    setFormData((f) => ({
      ...f,
      fields: f.fields.filter((field) => field.id !== id),
    }));
  }

  async function save() {
    if (!formData.title.trim()) return alert("Form title is required");
    setSaving(true);
    const res = await fetch("/api/intake-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.title,
        description: formData.description,
        fields: formData.fields,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const form = await res.json();
      router.push(`/dashboard/intake/${form.id}`);
    } else {
      alert("Failed to save form");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">New Intake Form</h1>

      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New Patient Intake"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description shown to clients"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.fields.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No fields yet. Add some below.
            </p>
          )}

          {formData.fields.map((field) => (
            <div key={field.id} className="rounded-lg border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as Field["type"] })}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeField(field.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {field.type !== "heading" ? (
                <>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      className="mt-1"
                    />
                  </div>
                  {(field.type === "text" || field.type === "textarea") && (
                    <div>
                      <Label>Placeholder text</Label>
                      <Input
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="Optional placeholder"
                        className="mt-1"
                      />
                    </div>
                  )}
                  {field.type === "select" && (
                    <div>
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={field.options ?? ""}
                        onChange={(e) => updateField(field.id, { options: e.target.value })}
                        placeholder={"Option 1\nOption 2\nOption 3"}
                        className="mt-1 font-mono text-xs"
                        rows={4}
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    Required
                  </label>
                </>
              ) : (
                <div>
                  <Label>Heading text</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Section heading"
                    className="mt-1 font-semibold"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {FIELD_TYPES.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant="outline"
                onClick={() => addField(t.value as Field["type"])}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Form"}
        </Button>
      </div>
    </div>
  );
}
