"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, CalendarDays, CreditCard, FileText, ClipboardList, MessageSquare, Loader2 } from "lucide-react";

type ResultType = "client" | "appointment" | "invoice" | "note" | "form" | "message";

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_ICON: Record<ResultType, React.ComponentType<{ className?: string }>> = {
  client: Users,
  appointment: CalendarDays,
  invoice: CreditCard,
  note: FileText,
  form: ClipboardList,
  message: MessageSquare,
};

const TYPE_LABEL: Record<ResultType, string> = {
  client: "Client",
  appointment: "Appointment",
  invoice: "Invoice",
  note: "SOAP Note",
  form: "Intake Form",
  message: "Message",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setSelected(0);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" && results[selected]) {
        navigate(results[selected].href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, onClose]);

  if (!open) return null;

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 shrink-0 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, appointments, invoices…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {query.length >= 2 && !loading && results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              No results for <span className="font-medium text-gray-600">"{query}"</span>
            </p>
          )}
          {query.length < 2 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">Type to search across clients, appointments, invoices, notes, and more.</p>
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-1">
              <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {TYPE_LABEL[type as ResultType]}s
              </p>
              {items.map((item) => {
                const currentIndex = flatIndex++;
                const Icon = TYPE_ICON[item.type];
                const isSelected = currentIndex === selected;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelected(currentIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-indigo-500" : "text-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700" : "text-gray-900"}`}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
            <span><kbd className="rounded border border-gray-200 px-1">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded border border-gray-200 px-1">↵</kbd> Open</span>
            <span><kbd className="rounded border border-gray-200 px-1">Esc</kbd> Close</span>
          </div>
        )}
      </div>
    </div>
  );
}
