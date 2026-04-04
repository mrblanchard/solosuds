"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { formatPhone, stripPhone, normalizeEmail } from "@/lib/utils";

interface OrgData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  timezone: string | null;
}

interface Props {
  org: OrgData;
}

export default function OrgSettings({ org }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: org.name,
    phone: org.phone ?? "",
    email: org.email ?? "",
    address: org.address ?? "",
    website: org.website ?? "",
    timezone: org.timezone ?? "America/New_York",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Organization"}
        </Button>
        </form>
      </CardContent>
    </Card>
  );
}
