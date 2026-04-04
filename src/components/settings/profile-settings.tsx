"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validatePassword, PASSWORD_RULES, formatPhone, stripPhone } from "@/lib/utils";

interface Props {
  user: { id: string; name: string | null; email: string | null; role: string; smsForwardNumber: string | null };
}

export default function ProfileSettings({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [smsForwardNumber, setSmsForwardNumber] = useState(user.smsForwardNumber ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

    if (!name.trim()) {
      setMessage("Name is required.");
      setSaving(false);
      return;
    }
    if (name.length > 200) {
      setMessage("Name is too long.");
      setSaving(false);
      return;
    }
    if (newPassword) {
      const pwError = validatePassword(newPassword);
      if (pwError) {
        setMessage(pwError);
        setSaving(false);
        return;
      }
    }

    const body: Record<string, string> = { name, smsForwardNumber: stripPhone(smsForwardNumber) };
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Profile saved.");
      setCurrentPassword("");
      setNewPassword("");
      router.refresh();
    } else {
      const json = await res.json();
      setMessage(json.error ?? "Failed to save.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email ?? ""} disabled className="mt-1 bg-gray-50" />
          <p className="mt-1 text-xs text-gray-400">Contact support to change your email.</p>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">SMS Notifications</h3>
          <div>
            <Label htmlFor="smsForwardNumber">Forward SMS replies to</Label>
            <Input
              id="smsForwardNumber"
              type="tel"
              value={smsForwardNumber}
              onChange={(e) => setSmsForwardNumber(formatPhone(e.target.value))}
              className="mt-1"
              placeholder="802-258-0000"
            />
            <p className="mt-1 text-xs text-gray-400">When clients reply via text, forward the message to this number and email you a notification.</p>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Change password</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
                placeholder="Leave blank to keep current"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Minimum 12 characters"
              />
              <p className="mt-1 text-xs text-gray-400">{PASSWORD_RULES}</p>
            </div>
          </div>
        </div>
        {message && (
          <p className={`text-sm ${message.includes("saved") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </Button>
        </form>
      </CardContent>
    </Card>
  );
}
