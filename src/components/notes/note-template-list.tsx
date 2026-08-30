"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Star, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface TemplateItem {
  id: string;
  name: string;
  sessionType: string | null;
  isDefault: boolean;
  _count: { soapNotes: number };
  createdAt: string;
}

interface Props {
  templates: TemplateItem[];
}

export default function NoteTemplateList({ templates: initial }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function handleCreated(t: TemplateItem) {
    setTemplates((prev) => [...prev, t]);
    setShowForm(false);
  }

  function handleUpdated(t: TemplateItem) {
    setTemplates((prev) =>
      prev.map((p) =>
        p.id === t.id ? t : t.isDefault ? { ...p, isDefault: false } : p
      )
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/notes/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {showForm && !editingId && (
        <TemplateForm onSave={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {templates.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-400 mb-2">No templates yet</p>
          <p className="text-sm text-gray-400">
            Create a template to pre-fill notes with prompts and default billing codes.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((t) =>
          editingId === t.id ? (
            <TemplateForm
              key={t.id}
              initial={t}
              onSave={handleUpdated}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 hover:border-indigo-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                    {t.isDefault && (
                      <Badge variant="success" className="shrink-0">
                        <Star className="h-3 w-3 mr-1" /> Default
                      </Badge>
                    )}
                  </div>
                  {t.sessionType && (
                    <p className="mt-0.5 text-sm text-gray-500">{t.sessionType}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Used in {t._count.soapNotes} note{t._count.soapNotes !== 1 ? "s" : ""} ·
                Created {formatDate(t.createdAt)}
              </div>
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button size="sm" variant="outline" onClick={() => setEditingId(t.id)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {deleting === t.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Inline form for create / edit ──────────────────────────────────────────

interface FormProps {
  initial?: {
    id: string;
    name: string;
    sessionType: string | null;
    isDefault: boolean;
  };
  onSave: (t: TemplateItem) => void;
  onCancel: () => void;
}

function TemplateForm({ initial, onSave, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sessionType, setSessionType] = useState(initial?.sessionType ?? "");
  const [subjectivePrompt, setSubjectivePrompt] = useState("");
  const [objectivePrompt, setObjectivePrompt] = useState("");
  const [assessmentPrompt, setAssessmentPrompt] = useState("");
  const [planPrompt, setPlanPrompt] = useState("");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!initial);

  // Fetch full template data when editing  
  useState(() => {
    if (initial && !loaded) {
      fetch(`/api/notes/templates/${initial.id}`)
        .then((r) => r.json())
        .then((t) => {
          setSubjectivePrompt(t.subjectivePrompt ?? "");
          setObjectivePrompt(t.objectivePrompt ?? "");
          setAssessmentPrompt(t.assessmentPrompt ?? "");
          setPlanPrompt(t.planPrompt ?? "");
          setLoaded(true);
        });
    }
  });

  async function save() {
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      sessionType: sessionType.trim() || null,
      subjectivePrompt: subjectivePrompt.trim() || null,
      objectivePrompt: objectivePrompt.trim() || null,
      assessmentPrompt: assessmentPrompt.trim() || null,
      planPrompt: planPrompt.trim() || null,
      isDefault,
    };

    const url = initial
      ? `/api/notes/templates/${initial.id}`
      : "/api/notes/templates";

    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const t = await res.json();
      onSave({
        id: t.id,
        name: t.name,
        sessionType: t.sessionType,
        isDefault: t.isDefault,
        _count: initial ? (initial as any)._count ?? { soapNotes: 0 } : { soapNotes: 0 },
        createdAt: t.createdAt,
      });
    }
    setSaving(false);
  }

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-white p-5 sm:col-span-2">
      <h3 className="font-semibold text-gray-900 mb-4">
        {initial ? "Edit Template" : "New Template"}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Swedish Massage, Deep Tissue…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Type
          </label>
          <input
            type="text"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            placeholder="e.g. 60-min session, Initial eval…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs text-gray-500">
          Add prompt text that will pre-fill each SOAP section. Leave blank to skip.
        </p>
        {[
          { label: "Subjective Prompt", value: subjectivePrompt, set: setSubjectivePrompt, placeholder: "e.g. Client reports…" },
          { label: "Objective Prompt", value: objectivePrompt, set: setObjectivePrompt, placeholder: "e.g. Observed ROM, palpation findings…" },
          { label: "Assessment Prompt", value: assessmentPrompt, set: setAssessmentPrompt, placeholder: "e.g. Treatment focused on…" },
          { label: "Plan Prompt", value: planPrompt, set: setPlanPrompt, placeholder: "e.g. Continue weekly sessions, home exercises…" },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {f.label}
            </label>
            <textarea
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        Set as default template (auto-selected when creating new notes)
      </label>

      <div className="mt-4 flex gap-2">
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : initial ? "Update Template" : "Create Template"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
