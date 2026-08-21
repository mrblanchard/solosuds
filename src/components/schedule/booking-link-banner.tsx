"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Settings2, Wrench } from "lucide-react";

export default function BookingLinkBanner({ orgSlug }: { orgSlug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const bookingUrl = origin ? `${origin}/book/${orgSlug}` : "";

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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Your online booking link</p>
          <p className="mt-0.5 truncate font-mono text-sm text-gray-700">{bookingUrl || "Loading…"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyLink} disabled={!bookingUrl}>
            {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          {bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </a>
          )}
          <Link href="/dashboard/settings#services-settings">
            <Button type="button" variant="outline" size="sm">
              <Wrench className="h-4 w-4 mr-1" />
              Manage Services
            </Button>
          </Link>
          <Link href="/dashboard/settings#booking-availability">
            <Button type="button" variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1" />
              Scheduling Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
