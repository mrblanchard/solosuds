"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Copy, Check, ExternalLink, Settings2, Code2 } from "lucide-react";
import Link from "next/link";

interface BookingSettingsProps {
  orgSlug: string;
  bookingStartHour: number;
  bookingEndHour: number;
  bookingDays: number[];
  bookingSlotMinutes: number;
  maxDailyAppointments: number | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingSettings({
  orgSlug,
  bookingStartHour,
  bookingEndHour,
  bookingDays,
  bookingSlotMinutes,
  maxDailyAppointments,
}: BookingSettingsProps) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  const [startHour, setStartHour] = useState(bookingStartHour);
  const [endHour, setEndHour] = useState(bookingEndHour);
  const [days, setDays] = useState<number[]>(bookingDays);
  const [slotMinutes, setSlotMinutes] = useState(bookingSlotMinutes);
  const [maxDaily, setMaxDaily] = useState<string>(maxDailyAppointments != null ? String(maxDailyAppointments) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const bookingUrl = origin ? `${origin}/book/${orgSlug}` : "";
  const embedSnippet = origin
    ? `<div data-solosuds-booking="${orgSlug}"></div>\n<script src="${origin}/embed.js" async></script>`
    : "";

  async function copyLink() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = bookingUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function copySnippet() {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
    } catch {
      const el = document.createElement("textarea");
      el.value = embedSnippet;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  }

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  async function saveAvailability() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingStartHour: startHour,
          bookingEndHour: endHour,
          bookingDays: days,
          bookingSlotMinutes: slotMinutes,
          maxDailyAppointments: maxDaily.trim() === "" ? null : parseInt(maxDaily, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-500" />
          Online Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-500">
          Share your booking page with clients so they can request appointments
          online, no account needed.
        </p>

        {/* Booking link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Your booking link
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 truncate select-all font-mono">
              {bookingUrl || "Loading…"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyLink}
              disabled={!bookingUrl}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button type="button" variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Embed widget */}
        <div className="rounded-lg border border-gray-100 p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Code2 className="h-4 w-4 text-gray-400" />
            Embed on your website
          </p>
          <p className="text-xs text-gray-500">
            Paste this into your website to show the booking widget directly on your own page,
            instead of sending clients to your booking link.
          </p>
          <div className="flex items-start gap-2">
            <pre className="flex-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
              {embedSnippet || "Loading…"}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copySnippet}
              disabled={!embedSnippet}
              className="shrink-0"
            >
              {snippetCopied ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Availability config */}
        <div id="booking-availability" className="rounded-lg border border-gray-100 p-4 space-y-4 scroll-mt-6">
          <p className="text-sm font-medium text-gray-700">Availability</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startHour">Opens at</Label>
              <select
                id="startHour"
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="endHour">Closes at</Label>
              <select
                id="endHour"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                  <option key={h} value={h}>{h === 24 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Days open</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    days.includes(i)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slotMinutes">Slot interval (minutes)</Label>
              <select
                id="slotMinutes"
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value))}
                className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="maxDaily">Max appointments/day</Label>
              <Input
                id="maxDaily"
                type="number"
                min={1}
                placeholder="No limit"
                value={maxDaily}
                onChange={(e) => setMaxDaily(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={saveAvailability} disabled={saving}>
              {saving ? "Saving…" : saved ? "Saved!" : "Save Availability"}
            </Button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              step: "1",
              title: "Configure services",
              desc: "Use the Services section below to set up the services clients can book, including names, durations, and prices.",
            },
            {
              step: "2",
              title: "Share your link",
              desc: "Add the booking link to your website, Instagram bio, email signature, or anywhere clients can find it.",
            },
            {
              step: "3",
              title: "Confirm appointments",
              desc: "Booking requests appear in your Schedule as pending. Review and confirm them from the dashboard.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {step}
                </span>
                <span className="text-xs font-semibold text-gray-700">{title}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-3 pt-1">
          <Settings2 className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500">
            Manage available services in the{" "}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("services-settings");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="text-indigo-600 hover:underline"
            >
              Services section
            </button>{" "}
            below. Only active services are shown on your booking page.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
