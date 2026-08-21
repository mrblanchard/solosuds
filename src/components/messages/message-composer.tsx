"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface Props {
  clientId: string;
  /** True when the client has a phone number and has actively opted in to texts. */
  canText: boolean;
}

export default function MessageComposer({ clientId, canText }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!content.trim() || !canText) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send text");
      }
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send text");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  }

  if (!canText) {
    return (
      <div className="border-t border-gray-100 p-4 text-sm text-gray-500">
        This client hasn&apos;t opted in to text messages, so you can&apos;t message them here.
        They can opt in the next time they book through your public booking page.
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 p-4">
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-3 items-end">
        <Textarea
          aria-label="Message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a text message… (Ctrl+Enter to send)"
          className="resize-none min-h-[80px]"
          maxLength={1500}
        />
        <Button onClick={send} disabled={loading || !content.trim()} size="icon" className="h-10 w-10 shrink-0" aria-label="Send text">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-gray-400">Sent as a text message. Msg &amp; data rates may apply.</p>
    </div>
  );
}
