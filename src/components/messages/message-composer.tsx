"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface Props {
  clientId: string;
}

export default function MessageComposer({ clientId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!content.trim()) return;
    setLoading(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, content }),
    });
    setContent("");
    setLoading(false);
    router.refresh();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="border-t border-gray-100 p-4 flex gap-3 items-end">
      <Textarea
        aria-label="Message"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message… (Ctrl+Enter to send)"
        className="resize-none min-h-[80px]"
      />
      <Button onClick={send} disabled={loading || !content.trim()} size="icon" className="h-10 w-10 shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
