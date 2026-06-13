"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { formatPhone, stripPhone, normalizeEmail } from "@/lib/utils";
import { Copy, Check, RefreshCw, Mail, X } from "lucide-react";

interface OrgData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  timezone: string | null;
  practiceType: string;
  noteType: string;
  defaultIntakeFormId: string | null;
  inviteCode: string | null;
}

interface IntakeForm {
  id: string;
  title: string;
}

interface Props {
  org: OrgData;
  intakeForms?: IntakeForm[];
  plan?: string;
}

export default function OrgSettings({ org, intakeForms = [], plan = "solo" }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: org.name,
    phone: org.phone ?? "",
    email: org.email ?? "",
    address: org.address ?? "",
    website: org.website ?? "",
    timezone: org.timezone ?? "America/New_York",
    practiceType: org.practiceType ?? "OTHER",
    noteType: org.noteType ?? "SOAP",
    defaultIntakeFormId: org.defaultIntakeFormId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState(org.inviteCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("PRACTITIONER");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    if (!form.name.trim()) {
      setMessage("Organization name is required.");
      setSaving(false);
      return;
    }
    if (form.name.length > 200) {
      setMessage("Organization name is too long.");
      setSaving(false);
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setMessage("Invalid email address.");
      setSaving(false);
      return;
    }
    if (form.phone && !/^[+]?[\d-]{7,20}$/.test(stripPhone(form.phone))) {
      setMessage("Invalid phone number.");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      email: form.email ? normalizeEmail(form.email) : form.email,
      phone: form.phone ? stripPhone(form.phone) : form.phone,
    };

    const res = await fetch("/api/settings/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Organization saved.");
      router.refresh();
    } else {
      const json = await res.json();
      setMessage(json.error ?? "Failed to save.");
    }
  }

  const fields: Array<{ key: keyof typeof form; label: string; type?: string }> = [
    { key: "name", label: "Practice / Organization name" },
    { key: "email", label: "Contact email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "website", label: "Website", type: "url" },
    { key: "timezone", label: "Timezone" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Invite Link */}
        <div className="mb-4 pb-4 border-b">
          <Label htmlFor="inviteLink">Team Registration Link</Label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Share this link with team members so they can register and join your organization
          </p>
          {inviteCode ? (
            <div className="flex items-center gap-2">
              <Input
                id="inviteLink"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${inviteCode}`}
                className="flex-1 text-sm font-mono bg-gray-50"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/register?invite=${inviteCode}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowEmailModal(true); setInviteEmail(""); setInviteMessage(null); }}
                className="shrink-0"
                title="Email this link"
              >
                <Mail className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={regenerating}
                onClick={async () => {
                  setRegenerating(true);
                  const res = await fetch("/api/settings/organization/invite", { method: "POST" });
                  if (res.ok) {
                    const data = await res.json();
                    setInviteCode(data.inviteCode);
                  }
                  setRegenerating(false);
                }}
                className="shrink-0"
                title="Generate a new link (old link will stop working)"
              >
                <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={async () => {
                setRegenerating(true);
                const res = await fetch("/api/settings/organization/invite", { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  setInviteCode(data.inviteCode);
                }
                setRegenerating(false);
              }}
            >
              Generate Invite Link
            </Button>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        {fields.map((f) => (
          <div key={f.key} className="mb-4">
            <Label htmlFor={f.key}>{f.label}</Label>
            {f.key === "address" ? (
              <AddressAutocomplete
                id={f.key}
                value={form.address}
                onChange={(v) => set("address", v)}
                onSelect={(parsed) => set("address", [parsed.address, parsed.city, parsed.state, parsed.zip, parsed.country].filter(Boolean).join(", "))}
                placeholder="Start typing an address…"
                className="mt-1"
              />
            ) : f.key === "phone" ? (
              <Input
                id={f.key}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                placeholder="802-258-0000"
                className="mt-1"
              />
            ) : f.key === "email" ? (
              <Input
                id={f.key}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={(e) => set("email", normalizeEmail(e.target.value))}
                className="mt-1"
              />
            ) : (
              <Input
                id={f.key}
                type={f.type ?? "text"}
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="mt-1"
              />
            )}
          </div>
        ))}
        {message && (
          <p className={`text-sm ${message.includes("saved") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
        <div className="mb-4 pt-4 border-t">
          <Label>Practice Type</Label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            This adjusts the sidebar navigation and terminology for your practice
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { value: "THERAPY", label: "Therapy", desc: "Massage, PT, chiro, bodywork" },
              { value: "SALON", label: "Salon", desc: "Hair, nail, beauty" },
              { value: "MEDICAL", label: "Medical", desc: "Doctors, clinics" },
              { value: "FITNESS", label: "Fitness", desc: "Training, yoga, pilates" },
              { value: "OTHER", label: "General", desc: "Generic practice" },
            ] as const).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("practiceType", t.value)}
                className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
                  form.practiceType === t.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {t.label}
                <span className="block text-xs font-normal mt-0.5 text-gray-400">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4 pt-4 border-t">
          <Label>Note Format</Label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Choose the default note format for your practice
          </p>
          <div className="flex gap-2">
            {(["SOAP", "SESSION"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("noteType", t)}
                className={`flex-1 rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
                  form.noteType === t
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {t === "SOAP" ? "SOAP Notes" : "Session Notes"}
                <span className="block text-xs font-normal mt-0.5 text-gray-400">
                  {t === "SOAP"
                    ? "Subjective, Objective, Assessment, Plan"
                    : "Free-form session notes"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {intakeForms.length > 0 && (
          <div className="mb-4">
            <Label htmlFor="defaultIntakeFormId">Default Intake Form</Label>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">
              Automatically send this form when a new appointment is created
            </p>
            <select
              id="defaultIntakeFormId"
              value={form.defaultIntakeFormId}
              onChange={(e) => set("defaultIntakeFormId", e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              <option value="">None (don't auto-send)</option>
              {intakeForms.map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Organization"}
        </Button>
        </form>
      </CardContent>

      {/* Email Invite Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send Invite Email</h3>
              <button type="button" onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Enter an email address to send a team invitation for <strong>{form.name}</strong>.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              setSendingInvite(true);
              setInviteMessage(null);
              const res = await fetch("/api/settings/organization/invite-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
              });
              setSendingInvite(false);
              if (res.ok) {
                setInviteMessage("Invitation sent!");
                setInviteEmail("");
              } else {
                const data = await res.json();
                setInviteMessage(data.error ?? "Failed to send invitation");
              }
            }}>
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 mb-4"
                autoFocus
                required
              />
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="ADMIN">Admin — Full access</option>
                <option value="PRACTITIONER">Editor — Can add &amp; edit, cannot delete</option>
                <option value="FRONT_DESK">Staff — Clients, intake, notes &amp; email only</option>
              </select>
              {inviteMessage && (
                <p className={`text-sm mb-3 ${inviteMessage === "Invitation sent!" ? "text-green-600" : "text-red-600"}`}>
                  {inviteMessage}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendingInvite}>
                  {sendingInvite ? "Sending…" : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
