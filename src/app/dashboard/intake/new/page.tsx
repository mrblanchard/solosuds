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
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "heading" | "phone" | "email";
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
  { value: "phone", label: "Phone number" },
  { value: "email", label: "Email" },
  { value: "heading", label: "Section heading" },
];

const COMMON_FIELD_TEMPLATES: { label: string; description: string; fields: Omit<Field, "id">[] }[] = [
  {
    label: "Personal Information",
    description: "Name, DOB, gender, pronouns",
    fields: [
      { type: "heading", label: "Personal Information", required: false },
      { type: "text", label: "Full Name", placeholder: "Jane Smith", required: true },
      { type: "date", label: "Date of Birth", required: true },
      { type: "select", label: "Gender", required: false, options: "Female\nMale\nNon-binary\nPrefer not to say\nOther" },
      { type: "text", label: "Pronouns", placeholder: "e.g. she/her, they/them", required: false },
    ],
  },
  {
    label: "Contact Information",
    description: "Phone, email, address",
    fields: [
      { type: "heading", label: "Contact Information", required: false },
      { type: "phone", label: "Phone Number", placeholder: "802-258-0000", required: true },
      { type: "email", label: "Email Address", placeholder: "jane@example.com", required: true },
      { type: "text", label: "Street Address", placeholder: "123 Main St", required: false },
      { type: "text", label: "City", placeholder: "Burlington", required: false },
      { type: "text", label: "State", placeholder: "VT", required: false },
      { type: "text", label: "ZIP Code", placeholder: "05401", required: false },
    ],
  },
  {
    label: "Emergency Contact",
    description: "Name, phone, relationship",
    fields: [
      { type: "heading", label: "Emergency Contact", required: false },
      { type: "text", label: "Emergency Contact Name", placeholder: "John Smith", required: true },
      { type: "phone", label: "Emergency Contact Phone", placeholder: "802-258-0000", required: true },
      { type: "text", label: "Relationship to Client", placeholder: "e.g. Spouse, Parent", required: false },
    ],
  },
  {
    label: "Insurance Information",
    description: "Carrier, ID, group number",
    fields: [
      { type: "heading", label: "Insurance Information", required: false },
      { type: "text", label: "Insurance Carrier", placeholder: "e.g. Blue Cross Blue Shield", required: false },
      { type: "text", label: "Policy / Member ID", placeholder: "ABC123456", required: false },
      { type: "text", label: "Group Number", placeholder: "GRP-001", required: false },
      { type: "text", label: "Policy Holder Name", placeholder: "If different from client", required: false },
    ],
  },
  {
    label: "Medical History",
    description: "Conditions, medications, allergies",
    fields: [
      { type: "heading", label: "Medical History", required: false },
      { type: "textarea", label: "Current Medications", placeholder: "List all medications and dosages", required: false },
      { type: "textarea", label: "Known Allergies", placeholder: "List any allergies", required: false },
      { type: "textarea", label: "Past / Current Medical Conditions", placeholder: "List any relevant conditions", required: false },
      { type: "text", label: "Primary Care Physician", placeholder: "Dr. name", required: false },
    ],
  },
  {
    label: "Consent & Agreements",
    description: "Consent to treatment",
    fields: [
      { type: "heading", label: "Consent & Agreements", required: false },
      { type: "checkbox", label: "I consent to treatment as discussed with my provider", placeholder: "I agree", required: true },
      { type: "checkbox", label: "I consent to the treatment and services described", placeholder: "I consent", required: true },
      { type: "checkbox", label: "I authorize the release of information to my insurance carrier", placeholder: "I authorize", required: false },
    ],
  },
  {
    label: "Reason for Visit",
    description: "Chief concern, goals, referral source",
    fields: [
      { type: "heading", label: "Reason for Visit", required: false },
      { type: "textarea", label: "What brings you in today?", placeholder: "Describe your primary concern", required: true },
      { type: "textarea", label: "Goals for Treatment", placeholder: "What would you like to achieve?", required: false },
      { type: "text", label: "Referral Source", placeholder: "e.g. Dr. Smith, Google, Friend", required: false },
    ],
  },
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

  function addCommonFields(template: typeof COMMON_FIELD_TEMPLATES[number]) {
    setFormData((f) => ({
      ...f,
      fields: [
        ...f.fields,
        ...template.fields.map((t) => ({ ...t, id: generateId() })),
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
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New Patient Intake"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
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
                  aria-label="Remove field"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {field.type !== "heading" ? (
                <>
                  <div>
                    <Label htmlFor={`field-${field.id}-label`}>Label</Label>
                    <Input
                      id={`field-${field.id}-label`}
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      className="mt-1"
                    />
                  </div>
                  {(field.type === "text" || field.type === "textarea") && (
                    <div>
                      <Label htmlFor={`field-${field.id}-placeholder`}>Placeholder text</Label>
                      <Input
                        id={`field-${field.id}-placeholder`}
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="Optional placeholder"
                        className="mt-1"
                      />
                    </div>
                  )}
                  {field.type === "select" && (
                    <div>
                      <Label htmlFor={`field-${field.id}-options`}>Options (one per line)</Label>
                      <Textarea
                        id={`field-${field.id}-options`}
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
                  <Label htmlFor={`field-${field.id}-heading`}>Heading text</Label>
                  <Input
                    id={`field-${field.id}-heading`}
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

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Common Intake Sections</p>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_FIELD_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => addCommonFields(tpl)}
                  className="text-left rounded-lg border border-gray-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{tpl.label}</p>
                  <p className="text-xs text-gray-500">{tpl.description}</p>
                </button>
              ))}
            </div>
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
