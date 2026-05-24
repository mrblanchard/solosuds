"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Copy, Check, ExternalLink, Settings2 } from "lucide-react";
import Link from "next/link";

interface BookingSettingsProps {
  orgId: string;
}

export default function BookingSettings({ orgId }: BookingSettingsProps) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const bookingUrl = origin ? `${origin}/book?org=${orgId}` : "";

  async function copyLink() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
          online — no account needed.
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
