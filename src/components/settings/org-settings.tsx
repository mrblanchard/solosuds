"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const res = await fetch("/api/settings/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
        {fields.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input
              type={f.type ?? "text"}
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className="mt-1"
            />
          </div>
        ))}
        {message && (
          <p className={`text-sm ${message.includes("saved") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Organization"}
        </Button>
      </CardContent>
    </Card>
  );
}
