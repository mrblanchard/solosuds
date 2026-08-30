"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  invoice: { id: string; status: string; publicToken: string | null };
}

export default function InvoiceActions({ invoice }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (status === "SENT" && res.ok) {
      const data = await res.json();
      setMessage(
        data.emailSent
          ? "Invoice sent to client by email."
          : "Status updated, but the email couldn't be sent. Use Copy Payment Link instead."
      );
    }
    setLoading(false);
    router.refresh();
  }

  function copyPaymentLink() {
    if (!invoice.publicToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.publicToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {invoice.status === "DRAFT" && (
          <Button onClick={() => updateStatus("SENT")} disabled={loading}>
            Send Invoice
          </Button>
        )}
        {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
          <>
            <Button onClick={() => updateStatus("PAID")} disabled={loading}>
              Mark as Paid
            </Button>
            <Button variant="outline" onClick={copyPaymentLink} disabled={loading || !invoice.publicToken}>
              {copied ? "Link Copied!" : "Copy Payment Link"}
            </Button>
          </>
        )}
        {invoice.status !== "VOID" && invoice.status !== "PAID" && (
          <Button variant="outline" onClick={() => updateStatus("VOID")} disabled={loading}>
            Void Invoice
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}
