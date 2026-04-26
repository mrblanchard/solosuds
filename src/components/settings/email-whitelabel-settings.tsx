"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Info } from "lucide-react";

interface Props {
  initialReplyToEmail: string;
}

export default function EmailWhiteLabelSettings({ initialReplyToEmail }: Props) {
  const [replyTo, setReplyTo] = useState(initialReplyToEmail);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const trimmed = replyTo.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyToEmail: trimmed || null }),
      });
      if (res.ok) {
        setMessage(trimmed ? "Reply-to address saved." : "Reply-to address cleared.");
      } else {
        const data = await res.json();
        setMessage(data.error ?? "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-500" />
          Email Sending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* How email sending works */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">How outgoing email works</p>
              <p className="text-blue-700">
                Emails are sent from <span className="font-mono font-semibold">no-reply@solosuds.com</span> using
                your practice name as the display name — so clients see your brand, not "SoloSuds".
              </p>
              <p className="text-blue-700">
                Set a <strong>reply-to address</strong> below so that when a client hits Reply, it goes
                directly to your inbox instead of the no-reply address.
              </p>
            </div>
          </div>
        </div>

        {/* Reply-to address */}
        <div className="space-y-2">
          <Label htmlFor="reply-to">Reply-To Email Address</Label>
          <p className="text-xs text-gray-500">
            When clients reply to automated emails (reminders, intake forms, etc.), their reply will be sent here.
            Leave blank to use the default no-reply address.
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="reply-to"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="max-w-xs"
              maxLength={320}
            />
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            {replyTo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400"
                onClick={() => { setReplyTo(""); }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* What clients see */}
        <div className="space-y-2">
          <Label>What clients see</Label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm font-mono">
            <div className="flex gap-2 text-gray-600">
              <span className="w-16 shrink-0 text-gray-400">From:</span>
              <span className="text-gray-800">Your Practice Name &lt;no-reply@solosuds.com&gt;</span>
            </div>
            <div className="flex gap-2 text-gray-600">
              <span className="w-16 shrink-0 text-gray-400">Reply-To:</span>
              <span className={replyTo.trim() ? "text-green-700 font-semibold" : "text-gray-400 italic"}>
                {replyTo.trim() || "not set — replies bounce"}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            The display name shown in "From:" comes from your Practice Name in the Branding section above.
          </p>
        </div>

        {message && (
          <p className={`text-sm ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("valid") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
