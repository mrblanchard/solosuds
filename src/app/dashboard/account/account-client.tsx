"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, CreditCard, Trash2, AlertTriangle, CheckCircle, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  notificationsEnabled: boolean;
  createdAt: Date;
}

interface Org {
  id: string;
  name: string;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
}

interface Props {
  user: User;
  org: Org;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  active: "success",
  trialing: "warning",
  canceling: "warning",
  canceled: "destructive",
  past_due: "destructive",
  paused: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Free Trial",
  canceling: "Canceling",
  canceled: "Canceled",
  past_due: "Past Due",
  paused: "Paused",
};

export default function AccountClient({ user, org }: Props) {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled);
  const [savingNotif, setSavingNotif] = useState(false);

  // Cancel subscription state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ expiresAt: string } | null>(null);

  // Pause subscription state
  const [pauseLoading, setPauseLoading] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  // Delete account state
  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden, 1=warn1, 2=warn2, 3=confirm
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const status = org.subscriptionStatus ?? "unknown";
  const isOwnerOrAdmin = user.role === "OWNER" || user.role === "ADMIN";

  // Trial days remaining
  const TRIAL_DAYS = 14;
  const trialDaysLeft = status === "trialing"
    ? Math.max(0, Math.ceil((new Date(org.createdAt).getTime() + TRIAL_DAYS * 86400000 - Date.now()) / 86400000))
    : 0;

  async function toggleNotifications(val: boolean) {
    setSavingNotif(true);
    setNotificationsEnabled(val);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationsEnabled: val }),
    });
    setSavingNotif(false);
  }

  async function cancelSubscription() {
    setCancelLoading(true);
    const res = await fetch("/api/account/subscription", { method: "POST" });
    const data = await res.json();
    setCancelLoading(false);
    if (res.ok) {
      setCancelResult({ expiresAt: data.expiresAt });
      setShowCancelConfirm(false);
      router.refresh();
    }
  }

  async function reactivateSubscription() {
    await fetch("/api/account/subscription", { method: "DELETE" });
    router.refresh();
  }

  async function pauseSubscription() {
    setPauseLoading(true);
    const res = await fetch("/api/account/subscription", { method: "PATCH" });
    setPauseLoading(false);
    if (res.ok) {
      setShowPauseConfirm(false);
      router.refresh();
    }
  }

  async function resumeSubscription() {
    setPauseLoading(true);
    const res = await fetch("/api/account/subscription", { method: "PUT" });
    setPauseLoading(false);
    if (res.ok) router.refresh();
  }

  async function deleteAccount() {
    if (deleteConfirmText !== "DELETE MY ACCOUNT") return;
    setDeleteLoading(true);
    setDeleteError("");
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/login" });
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? "Failed to delete account");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your personal preferences and account settings.</p>
      </div>

      {/* Profile info */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Name</p>
            <p className="mt-1 text-gray-900">{user.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Email</p>
            <p className="mt-1 text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Role</p>
            <p className="mt-1 text-gray-900 capitalize">{user.role.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Organization</p>
            <p className="mt-1 text-gray-900">{org.name}</p>
          </div>
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/settings")}>
            Edit profile & organization settings
          </Button>
        </div>
      </section>

      {/* Notification preferences */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">In-app notifications</p>
            <p className="text-xs text-gray-500 mt-0.5">Receive alerts for new messages, paid invoices, and upcoming appointments.</p>
          </div>
          <button
            onClick={() => toggleNotifications(!notificationsEnabled)}
            disabled={savingNotif}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              notificationsEnabled ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                notificationsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Subscription */}
      {isOwnerOrAdmin && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Subscription</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">
                Status:{" "}
                <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
                  {STATUS_LABEL[status] ?? status}
                </Badge>
              </p>
              {status === "trialing" && (
                <p className="text-sm text-amber-700 font-medium mt-1">
                  {trialDaysLeft > 0
                    ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} remaining in your free trial`
                    : "Your free trial has ended"}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Organization created {new Date(org.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          {cancelResult && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Your subscription has been canceled. You'll retain access until{" "}
                <strong>{new Date(cancelResult.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>. No refunds are issued for monthly subscriptions.
              </p>
            </div>
          )}

          {status === "paused" && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <PauseCircle className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                <div>
                  <p className="font-medium">Your subscription is paused.</p>
                  <p className="mt-1 text-xs text-gray-500">Billing is on hold. Resume anytime to continue using all features.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={resumeSubscription}
                disabled={pauseLoading}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                {pauseLoading ? "Resuming…" : "Resume subscription"}
              </Button>
            </div>
          )}

          {status === "canceling" && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Your subscription is set to cancel at the end of the billing period.</p>
              <p className="mt-1">No refunds are issued for monthly subscriptions.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={reactivateSubscription}
              >
                Reactivate subscription
              </Button>
            </div>
          )}

          {status !== "canceling" && status !== "canceled" && status !== "paused" && org.stripeSubscriptionId && !showCancelConfirm && !showPauseConfirm && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPauseConfirm(true)}
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <PauseCircle className="h-4 w-4 mr-1" />
                Pause membership
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel membership
              </Button>
            </div>
          )}

          {showPauseConfirm && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <PauseCircle className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pause your membership?</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Your billing will be paused and you won&apos;t be charged until you resume. Your data will be preserved, but you won&apos;t be able to access your account while paused.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowPauseConfirm(false)} disabled={pauseLoading}>
                  Keep active
                </Button>
                <Button
                  size="sm"
                  onClick={pauseSubscription}
                  disabled={pauseLoading}
                  className="bg-gray-700 hover:bg-gray-800 text-white"
                >
                  {pauseLoading ? "Pausing…" : "Yes, pause membership"}
                </Button>
              </div>
            </div>
          )}

          {showCancelConfirm && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Cancel subscription?</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Your account will remain active until the end of the current billing period. After that, you'll lose access to all data. <strong>No refunds are issued for monthly subscriptions.</strong>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={cancelLoading}>
                  Keep subscription
                </Button>
                <Button
                  size="sm"
                  onClick={cancelSubscription}
                  disabled={cancelLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {cancelLoading ? "Canceling…" : "Yes, cancel"}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Delete account */}
      {user.role === "OWNER" && (
        <section className="rounded-2xl border border-red-100 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
          </div>

          <p className="text-sm text-gray-600">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {deleteStep === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setDeleteStep(1)}
            >
              Delete account
            </Button>
          )}

          {deleteStep === 1 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                  <p className="text-xs text-red-700 mt-1">
                    Deleting your account will <strong>permanently remove all clients, appointments, SOAP notes, invoices, and messages</strong> for your entire organization. Your Stripe subscription will be canceled immediately with no refund.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDeleteStep(0)}>Cancel</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDeleteStep(2)}>
                  I understand, continue
                </Button>
              </div>
            </div>
          )}

          {deleteStep === 2 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">This is your final warning.</p>
                  <p className="text-xs text-red-700 mt-1">
                    All data will be <strong>immediately and permanently deleted</strong>. There is no recovery. Your billing will be canceled with <strong>no refund</strong> for any remaining time on your plan.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDeleteStep(0)}>Cancel</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDeleteStep(3)}>
                  Yes, I want to delete everything
                </Button>
              </div>
            </div>
          )}

          {deleteStep === 3 && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-800">Type <code className="bg-red-100 px-1 rounded">DELETE MY ACCOUNT</code> to confirm:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {deleteError && (
                <p className="text-xs text-red-700">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setDeleteStep(0); setDeleteConfirmText(""); }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteConfirmText !== "DELETE MY ACCOUNT" || deleteLoading}
                  onClick={deleteAccount}
                >
                  {deleteLoading ? "Deleting…" : "Permanently delete account"}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
