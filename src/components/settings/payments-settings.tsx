"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wallet } from "lucide-react";

interface PaymentsData {
  stripeConnectAccountId: string | null;
  stripeConnectChargesEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
  stripeConnectPayoutsEnabled: boolean;
  venmoHandle: string | null;
  cashAppHandle: string | null;
  paypalHandle: string | null;
  squareHandle: string | null;
  zelleHandle: string | null;
}

interface Props {
  org: PaymentsData;
}

function PaymentsSettingsInner({ org }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [venmoHandle, setVenmoHandle] = useState(org.venmoHandle ?? "");
  const [cashAppHandle, setCashAppHandle] = useState(org.cashAppHandle ?? "");
  const [paypalHandle, setPaypalHandle] = useState(org.paypalHandle ?? "");
  const [squareHandle, setSquareHandle] = useState(org.squareHandle ?? "");
  const [zelleHandle, setZelleHandle] = useState(org.zelleHandle ?? "");
  const [savingAlt, setSavingAlt] = useState(false);
  const [altMessage, setAltMessage] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("stripe_connect");
    if (status === "return") setMessage("Stripe setup complete, check your status below.");
    else if (status === "refresh") setMessage("Setup was interrupted, click Continue Setup to finish.");
  }, [searchParams]);

  async function connectStripe() {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/stripe-connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to start Stripe setup.");
        return;
      }
      window.location.href = data.url;
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectStripe() {
    if (!confirm("Disconnect Stripe? Clients won't be able to pay invoices by card until you reconnect. Your Stripe account itself won't be affected.")) return;
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/stripe-connect", { method: "DELETE" });
      if (res.ok) {
        setMessage("Stripe disconnected.");
        router.refresh();
      } else {
        setMessage("Failed to disconnect.");
      }
    } finally {
      setDisconnecting(false);
    }
  }

  async function openDashboard() {
    setOpeningDashboard(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/stripe-connect/dashboard-link", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Unable to open Stripe dashboard.");
        return;
      }
      window.open(data.url, "_blank");
    } finally {
      setOpeningDashboard(false);
    }
  }

  async function saveAltPayments() {
    setSavingAlt(true);
    setAltMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venmoHandle, cashAppHandle, paypalHandle, squareHandle, zelleHandle }),
      });
      if (res.ok) {
        setAltMessage("Payment links saved.");
        router.refresh();
      } else {
        setAltMessage("Failed to save.");
      }
    } finally {
      setSavingAlt(false);
    }
  }

  const connected = !!org.stripeConnectAccountId;
  const chargesEnabled = org.stripeConnectChargesEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-600" />
          Payments
        </CardTitle>
        <p className="text-sm text-gray-500">
          Let clients pay invoices online and configure other ways to pay.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Stripe Connect */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" /> Card Payments (Stripe)
          </Label>
          <p className="text-xs text-gray-500">
            Connect your own Stripe account to accept card payments on invoices. Funds go directly to you, SoloSuds takes no fee.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!connected && (
              <Button type="button" size="sm" onClick={connectStripe} disabled={connecting}>
                {connecting ? "Redirecting..." : "Connect with Stripe"}
              </Button>
            )}
            {connected && !chargesEnabled && (
              <>
                <Badge variant="warning">Setup incomplete</Badge>
                <Button type="button" size="sm" onClick={connectStripe} disabled={connecting}>
                  {connecting ? "Redirecting..." : "Continue Setup"}
                </Button>
              </>
            )}
            {connected && chargesEnabled && (
              <>
                <Badge variant="success">Connected</Badge>
                <Button type="button" variant="outline" size="sm" onClick={openDashboard} disabled={openingDashboard}>
                  {openingDashboard ? "Opening..." : "Open Stripe Dashboard"}
                </Button>
              </>
            )}
            {connected && (
              <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={disconnectStripe} disabled={disconnecting}>
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>

        {/* Alt payment methods */}
        <div className="space-y-4 border-t border-gray-100 pt-6">
          <Label className="flex items-center gap-1">
            <Wallet className="h-4 w-4" /> Other Payment Methods
          </Label>
          <p className="text-xs text-gray-500">
            Add links for other ways clients can pay. They&apos;ll appear on invoices and payment emails, and you&apos;ll still need to mark these invoices as paid manually.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="venmoHandle">Venmo username</Label>
              <Input id="venmoHandle" value={venmoHandle} onChange={e => setVenmoHandle(e.target.value)} placeholder="yourname" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cashAppHandle">Cash App $cashtag</Label>
              <Input id="cashAppHandle" value={cashAppHandle} onChange={e => setCashAppHandle(e.target.value)} placeholder="yourcashtag" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paypalHandle">PayPal.me username</Label>
              <Input id="paypalHandle" value={paypalHandle} onChange={e => setPaypalHandle(e.target.value)} placeholder="yourname" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="squareHandle">Square payment link</Label>
              <Input id="squareHandle" value={squareHandle} onChange={e => setSquareHandle(e.target.value)} placeholder="https://square.link/u/..." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="zelleHandle">Zelle email or phone</Label>
              <Input id="zelleHandle" value={zelleHandle} onChange={e => setZelleHandle(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={saveAltPayments} disabled={savingAlt}>
              {savingAlt ? "Saving..." : "Save Payment Links"}
            </Button>
            {altMessage && <p className="text-sm text-gray-600">{altMessage}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentsSettings({ org }: Props) {
  return (
    <Suspense fallback={null}>
      <PaymentsSettingsInner org={org} />
    </Suspense>
  );
}
