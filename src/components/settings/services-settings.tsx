"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, X, Check, Loader2, Clock, DollarSign } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number; // cents
  color?: string | null;
  isActive: boolean;
}

interface Props {
  initialServices: Service[];
}

const COLORS = [
  "#7c6fac", "#5a8a6a", "#c47a4a", "#4a7ac4", "#c44a4a",
  "#4ac4b8", "#a4c44a", "#c4a44a", "#8a4ac4", "#4a8ac4",
];

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

interface ServiceFormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string; // dollars (user-facing)
  color: string;
}

const emptyForm: ServiceFormState = {
  name: "",
  description: "",
  durationMinutes: "60",
  price: "0",
  color: COLORS[0],
};

export default function ServicesSettings({ initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMinutes: String(s.durationMinutes),
      price: (s.price / 100).toFixed(2),
      color: s.color ?? COLORS[0],
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function field(key: keyof ServiceFormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) { setError("Name is required."); return; }
    const durationMinutes = parseInt(form.durationMinutes, 10);
    if (!durationMinutes || durationMinutes < 5) { setError("Duration must be at least 5 minutes."); return; }
    const price = Math.round(parseFloat(form.price || "0") * 100);
    if (isNaN(price) || price < 0) { setError("Price must be a positive number."); return; }

    setSaving(true);
    setError(null);
    try {
      const body = { name, description: form.description || null, durationMinutes, price, color: form.color };

      if (editingId) {
        const res = await fetch(`/api/services/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Service = await res.json();
        setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      } else {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Service = await res.json();
        setServices((prev) => [...prev, created]);
      }
      closeForm();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this service? It won't appear in the booking form but past appointments are preserved.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Failed to remove service. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeServices = services.filter((s) => s.isActive);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Services</CardTitle>
        {!showForm && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline form */}
        {showForm && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">{editingId ? "Edit Service" : "New Service"}</p>

            <div className="space-y-1">
              <Label htmlFor="svc-name">Name *</Label>
              <Input id="svc-name" value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="e.g. 60-min Massage" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea id="svc-desc" value={form.description} onChange={(e) => field("description", e.target.value)} placeholder="Optional description shown to clients" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="svc-duration">Duration (minutes) *</Label>
                <Input id="svc-duration" type="number" min={5} max={480} step={5} value={form.durationMinutes} onChange={(e) => field("durationMinutes", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="svc-price">Price ($)</Label>
                <Input id="svc-price" type="number" min={0} step={0.01} value={form.price} onChange={(e) => field("price", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => field("color", c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: form.color === c ? "#1e1b2e" : "transparent" }}
                    aria-label={c}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                {editingId ? "Save Changes" : "Create Service"}
              </Button>
              <Button size="sm" variant="outline" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Service list */}
        {activeServices.length === 0 && !showForm ? (
          <p className="text-sm text-gray-400 py-4 text-center">No services yet. Add one to enable service selection when booking.</p>
        ) : (
          <div className="space-y-2">
            {activeServices.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color ?? "#7c6fac" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-400 truncate">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDuration(s.durationMinutes)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <DollarSign className="h-3 w-3" />
                    {formatPrice(s.price)}
                  </div>
                  <button
                    onClick={() => openEdit(s)}
                    className="rounded p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeactivate(s.id)}
                    disabled={deletingId === s.id}
                    className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Remove"
                  >
                    {deletingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
