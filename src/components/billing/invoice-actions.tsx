"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  invoice: { id: string; status: string };
}

export default function InvoiceActions({ invoice }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      {invoice.status === "DRAFT" && (
        <Button onClick={() => updateStatus("SENT")} disabled={loading}>
          Send Invoice
        </Button>
      )}
      {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
        <Button onClick={() => updateStatus("PAID")} disabled={loading}>
          Mark as Paid
        </Button>
      )}
      {invoice.status !== "VOID" && invoice.status !== "PAID" && (
        <Button variant="outline" onClick={() => updateStatus("VOID")} disabled={loading}>
          Void Invoice
        </Button>
      )}
    </div>
  );
}
