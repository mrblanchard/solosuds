"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  invoice: { id: string; status: string; publicToken: string | null };
}

// Compact quick actions for the billing list row — mirrors the logic in
// components/billing/invoice-actions.tsx (the invoice detail page), just
// rendered inline so practitioners don't have to click into an invoice for
// the common status changes.
export default function InvoiceRowActions({ invoice }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function updateStatus(status: string) {
    setLoading(status);
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

  function copyPaymentLink() {
    if (!invoice.publicToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.publicToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canCollect = invoice.status === "SENT" || invoice.status === "OVERDUE";
  const canVoid = invoice.status !== "VOID" && invoice.status !== "PAID";

  return (
    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
      {canCollect && (
        <>
          <button
            type="button"
            onClick={() => updateStatus("PAID")}
            disabled={loading !== null}
            className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            {loading === "PAID" ? "Saving…" : "Mark as Paid"}
          </button>
          <button
            type="button"
            onClick={copyPaymentLink}
            disabled={loading !== null || !invoice.publicToken}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {copied ? "Link Copied!" : "Copy Payment Link"}
          </button>
        </>
      )}
      {canVoid && (
        <button
          type="button"
          onClick={() => updateStatus("VOID")}
          disabled={loading !== null}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {loading === "VOID" ? "Saving…" : "Void Invoice"}
        </button>
      )}
      <Link
        href={`/dashboard/billing/${invoice.id}`}
        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        View →
      </Link>
    </div>
  );
}
