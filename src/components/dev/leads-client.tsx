"use client";

import { useMemo, useState } from "react";
import { Phone, Mail, Globe, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/leads-types";
import { buildEmail, mailtoHref } from "@/lib/leads-email";
import AddLeadForm from "@/components/dev/add-lead-form";

/** Leads are entered as bare domains ("greenmountainmassage.com") as often as full URLs. */
function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export default function LeadsClient({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [lead.business, lead.contact, lead.location, lead.software, lead.talkingPoint, lead.website]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [leads, query]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6" suppressHydrationWarning>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Local Leads</h1>
          <p className="text-sm text-gray-500">Dev-only view, not available in production.</p>
        </div>

        <AddLeadForm />

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, town, or software (e.g. Keene, Acuity, Fullslate)…"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <p className="text-xs text-gray-400">{filtered.length} of {leads.length} leads</p>

        <div className="space-y-2">
          {filtered.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadRow({ lead, expanded, onToggle }: { lead: Lead; expanded: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const href = mailtoHref(lead);

  async function copyEmail() {
    const { subject, body } = buildEmail(lead);
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">{lead.business}</p>
          <p className="text-xs text-gray-500">
            {lead.contact ?? "Contact name unknown"} · {lead.location}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SoftwareBadge software={lead.software} />
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Phone</p>
              {lead.phone ? (
                <a href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {lead.phone}
                </a>
              ) : (
                <p className="text-sm text-gray-400">Not published</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
              {lead.email ? (
                <p className="text-sm text-gray-700">{lead.email}</p>
              ) : (
                <p className="text-sm text-gray-400">Not published</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Website</p>
              {lead.website ? (
                <a
                  href={websiteHref(lead.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{lead.website}</span>
                </a>
              ) : (
                <p className="text-sm text-gray-400">Not found</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Talking point</p>
            <p className="text-sm text-gray-700">{lead.talkingPoint}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {href && (
              <a href={href}>
                <Button size="sm">
                  <Mail className="h-3.5 w-3.5 mr-1.5" /> Draft email
                </Button>
              </a>
            )}
            <Button size="sm" variant="outline" onClick={copyEmail}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied" : "Copy email text"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SoftwareBadge({ software }: { software: Lead["software"] }) {
  const color =
    software === "None visible"
      ? "bg-green-50 text-green-700"
      : software === "Unknown"
      ? "bg-gray-100 text-gray-500"
      : "bg-yellow-50 text-yellow-700";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{software}</span>;
}
