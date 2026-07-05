"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus } from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  amount: number;
  active: boolean;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
}

export default function DiscountCodesSettings({ initialCodes }: { initialCodes: DiscountCode[] }) {
  const [codes, setCodes] = useState<DiscountCode[]>(initialCodes);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [amount, setAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createCode() {
    setError(null);
    const parsedAmount = type === "PERCENT" ? parseInt(amount, 10) : Math.round(parseFloat(amount || "0") * 100);
    if (!code.trim()) {
      setError("Enter a code name.");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          type,
          amount: parsedAmount,
          usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create code");
      }
      const created = await res.json();
      setCodes((prev) => [created, ...prev]);
      setCode("");
      setAmount("");
      setUsageLimit("");
      setExpiresAt("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    await fetch(`/api/settings/discount-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  async function deleteCode(id: string) {
    if (!confirm("Delete this discount code?")) return;
    setCodes((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/settings/discount-codes/${id}`, { method: "DELETE" });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-500" />
            Discount Codes
          </CardTitle>
          {!showForm && (
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New code
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
          Apply a discount code when creating an invoice, e.g. a promo for a first-time client or a referral thank-you.
        </p>

        {showForm && (
          <div className="rounded-lg border border-gray-100 p-4 space-y-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dc-code">Code</Label>
                <Input id="dc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER10" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="dc-type">Type</Label>
                <select
                  id="dc-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}
                  className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PERCENT">Percent off</option>
                  <option value="FIXED">Fixed amount off</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dc-amount">{type === "PERCENT" ? "Percent (1-100)" : "Amount ($)"}</Label>
                <Input
                  id="dc-amount"
                  type="number"
                  min="0"
                  step={type === "PERCENT" ? "1" : "0.01"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={type === "PERCENT" ? "10" : "5.00"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dc-limit">Usage limit (optional)</Label>
                <Input id="dc-limit" type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="No limit" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="dc-expires">Expires (optional)</Label>
              <Input id="dc-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={createCode} disabled={saving}>{saving ? "Saving…" : "Create Code"}</Button>
            </div>
          </div>
        )}

        {codes.length === 0 ? (
          <p className="text-sm text-gray-400">No discount codes yet.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">{c.code}</span>
                    <Badge variant={c.active ? "success" : "secondary"}>{c.active ? "Active" : "Disabled"}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.type === "PERCENT" ? `${c.amount}% off` : `$${(c.amount / 100).toFixed(2)} off`}
                    {c.usageLimit != null && ` · ${c.usageCount}/${c.usageLimit} used`}
                    {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(c.id, !c.active)}>
                    {c.active ? "Disable" : "Enable"}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => deleteCode(c.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
