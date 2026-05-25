"use client";

import { useState } from "react";
import { Mail, MessageSquare, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

interface Props {
  formId: string;
  clients: Client[];
}

export default function SendFormButtons({ formId, clients }: Props) {
  const [modal, setModal] = useState<"email" | "sms" | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const eligibleClients = clients.filter((c) =>
    modal === "email" ? !!c.email : !!c.phone
  );

  function openModal(type: "email" | "sms") {
    setModal(type);
    setSelectedClientId("");
    setSuccess(false);
    setError("");
  }

  function close() {
    setModal(null);
    setSelectedClientId("");
    setSuccess(false);
    setError("");
    setLoading(false);
  }

  async function send() {
    if (!selectedClientId || !modal) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/intake-forms/${formId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: modal, clientId: selectedClientId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(close, 2000);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => openModal("email")}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
      >
        <Mail className="h-3.5 w-3.5" />
        Email
      </button>
      <button
        onClick={() => openModal("sms")}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Text
      </button>

      {modal && (
        <div className="fixed inset-x-0 top-0 h-dvh z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Send via {modal === "email" ? "Email" : "Text Message"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modal === "email"
                    ? "Client will receive an email with a link to the form."
                    : "Client will receive an SMS with a link. Their reply will appear in Messages."}
                </p>
              </div>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 ml-4 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-green-700">
                <Check className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  {modal === "email" ? "Email" : "Text message"} sent successfully!
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {eligibleClients.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    No clients have {modal === "email" ? "an email address" : "a phone number"} on file.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Select a client:</p>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                      {eligibleClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClientId(c.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                            selectedClientId === c.id
                              ? "bg-indigo-50 border-r-2 border-indigo-500"
                              : ""
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {modal === "email" ? c.email : c.phone}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={close} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={send}
                    disabled={!selectedClientId || loading || eligibleClients.length === 0}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {modal === "email" ? "Send Email" : "Send Text"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
