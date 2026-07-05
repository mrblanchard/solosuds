"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: string; // dollars, converted to cents on submit
  cptCode: string;
}

interface Props {
  clients: Client[];
  defaultClientId?: string;
  defaultAppointmentId?: string;
}

const emptyItem = (): LineItem => ({
  description: "",
  quantity: 1,
  unitPrice: "",
  cptCode: "",
});

export default function NewInvoiceForm({ clients, defaultClientId, defaultAppointmentId }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [tax, setTax] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: "PERCENT" | "FIXED"; amount: number } | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState("");

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setLineItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    const parsedItems = lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: Math.round(parseFloat(item.unitPrice || "0") * 100),
      ...(item.cptCode ? { cptCode: item.cptCode } : {}),
    }));

    if (parsedItems.some((item) => !item.description || item.unitPrice <= 0)) {
      setError("All line items need a description and a price greater than $0.");
      return;
    }

    if (parsedItems.some((item) => item.description.length > 500)) {
      setError("Line item descriptions must be under 500 characters.");
      return;
    }

    const parsedTax = Math.round(parseFloat(tax || "0") * 100);
    if (parsedTax < 0) {
      setError("Tax cannot be negative.");
      return;
    }

    if (notes.length > 5000) {
      setError("Notes are too long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          ...(defaultAppointmentId ? { appointmentId: defaultAppointmentId } : {}),
          lineItems: parsedItems,
          ...(dueDate ? { dueDate } : {}),
          ...(notes ? { notes } : {}),
          tax: Math.round(parseFloat(tax || "0") * 100),
          ...(appliedDiscount ? { discountCode: appliedDiscount.code } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create invoice.");
        setLoading(false);
        return;
      }

      const invoice = await res.json();
      router.push(`/dashboard/billing/${invoice.id}`);
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  const subtotal = lineItems.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice || "0");
    return sum + item.quantity * (isNaN(price) ? 0 : price);
  }, 0);
  const taxAmount = parseFloat(tax || "0");
  const discountDollars = appliedDiscount
    ? Math.min(
        appliedDiscount.type === "PERCENT" ? subtotal * (appliedDiscount.amount / 100) : appliedDiscount.amount / 100,
        subtotal
      )
    : 0;
  const total = subtotal + (isNaN(taxAmount) ? 0 : taxAmount) - discountDollars;

  async function applyDiscountCode() {
    setDiscountError("");
    if (!discountCode.trim()) return;
    setCheckingDiscount(true);
    try {
      const res = await fetch(`/api/settings/discount-codes/preview?code=${encodeURIComponent(discountCode.trim())}`);
      const data = await res.json();
      if (!data.valid) {
        setDiscountError(data.error ?? "Invalid code");
        setAppliedDiscount(null);
        return;
      }
      setAppliedDiscount({ code: discountCode.trim().toUpperCase(), type: data.type, amount: data.amount });
    } catch {
      setDiscountError("Failed to check code");
    } finally {
      setCheckingDiscount(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Client */}
      <div className="space-y-2">
        <Label htmlFor="client">Client *</Label>
        <select
          id="client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line Items *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            + Add Item
          </Button>
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-20">CPT</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-16">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-28">Unit Price</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Row ${i + 1} description`}
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      required
                      className="border-0 shadow-none p-0 h-8 focus-visible:ring-0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Row ${i + 1} CPT code`}
                      placeholder="99213"
                      value={item.cptCode}
                      onChange={(e) => updateItem(i, "cptCode", e.target.value)}
                      className="border-0 shadow-none p-0 h-8 focus-visible:ring-0 w-20"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Row ${i + 1} quantity`}
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                      className="border-0 shadow-none p-0 h-8 text-right focus-visible:ring-0 w-16"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">$</span>
                      <Input
                        aria-label={`Row ${i + 1} unit price`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                        className="border-0 shadow-none p-0 h-8 text-right focus-visible:ring-0 w-24"
                        required
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove item ${i + 1}`}
                        onClick={() => removeItem(i)}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Totals + extras */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes for the client…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-medium uppercase text-gray-400">Summary</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="tax">Tax ($)</Label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">$</span>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="border border-gray-200 h-7 w-24 text-right text-sm"
                />
              </div>
            </div>

            {appliedDiscount ? (
              <div className="flex justify-between items-center text-green-700">
                <span>Discount ({appliedDiscount.code})</span>
                <div className="flex items-center gap-2">
                  <span>-${discountDollars.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Discount code"
                  placeholder="Discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="h-8 text-sm"
                />
                <Button type="button" size="sm" variant="outline" onClick={applyDiscountCode} disabled={checkingDiscount}>
                  {checkingDiscount ? "…" : "Apply"}
                </Button>
              </div>
            )}
            {discountError && <p className="text-xs text-red-600">{discountError}</p>}

            <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
