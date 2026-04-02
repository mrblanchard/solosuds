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

interface Props {
  form: {
    id: string;
    title: string;
    description: string;
    fields: Field[];
    isActive: boolean;
  };
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

export default function IntakeFormEditor({ form }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description);
  const [fields, setFields] = useState<Field[]>(form.fields);
  const [isActive, setIsActive] = useState(form.isActive);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function addField(type: Field["type"]) {
    setFields((f) => [...f, { id: generateId(), type, label: "", required: false }]);
  }

  function updateField(id: string, changes: Partial<Field>) {
    setFields((f) => f.map((field) => (field.id === id ? { ...field, ...changes } : field)));
  }

  f

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragEnter(index: number) {
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setFields((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dragOverIndex, 0, moved);
        return next;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }unction removeField(id: string) {
    setFields((f) => f.filter((field) => field.id !== id));
  }

  async function save() {
    if (!title.trim()) return alert("Form title is required");
    setSaving(true);
    const res = await fetch(`/api/intake-forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, fields, isActive }),
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Failed to save: ${err?.error ?? "Unknown error"}`);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600"
            />
            Form is active (clients can submit)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <p className="te, index) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`rounded-lg border p-4 space-y-3 transition-all ${
                dragIndex === index
                  ? "opacity-40 border-dashed border-indigo-300 bg-indigo-50"
                  : dragOverIndex === index && dragIndex !== index
                  ? "border-indigo-400 border-2 shadow-sm"
                  : "border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as Field["type"] })}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </divion key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button onClick={() => removeField(field.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {field.type !== "heading" ? (
                <>
                  <div>
                    <Label>Label</Label>
                    <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="Field label" className="mt-1" />
                  </div>
                  {(field.type === "text" || field.type === "textarea") && (
                    <div>
                      <Label>Placeholder text</Label>
                      <Input value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="Optional placeholder" className="mt-1" />
                    </div>
                  )}
                  {field.type === "select" && (
                    <div>
                      <Label>Options (one per line)</Label>
                      <Textarea value={field.options ?? ""} onChange={(e) => updateField(field.id, { options: e.target.value })} placeholder={"Option 1\nOption 2\nOption 3"} className="mt-1 font-mono text-xs" rows={4} />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="rounded border-gray-300 text-indigo-600" />
                    Required
                  </label>
                </>
              ) : (
                <div>
                  <Label>Heading text</Label>
                  <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="Section heading" className="mt-1 font-semibold" />
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {FIELD_TYPES.map((t) => (
              <Button key={t.value} size="sm" variant="outline" onClick={() => addField(t.value as Field["type"])}>
                <Plus className="mr-1 h-3 w-3" />
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/intake")}>Back to list</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
    </div>
  );
}
