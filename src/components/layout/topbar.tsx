"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Search, Menu } from "lucide-react";
import SearchModal from "@/components/layout/search-modal";
import NotificationsPanel from "@/components/layout/notifications-panel";
import AccountMenu from "@/components/layout/account-menu";

interface TopbarProps {
  onMenuClick?: () => void;
  branding?: { name: string; logoUrl: string | null; primaryColor: string | null } | null;
}

const PRACTICE_LABELS: Record<string, string> = {
  THERAPY: "Therapy & Bodywork",
  SALON:   "Salon & Beauty",
  MEDICAL: "Medical Practice",
  FITNESS: "Fitness & Wellness",
  LESSONS: "Lessons & Tutoring",
  OTHER:   "General Practice",
};

export function Topbar({ onMenuClick, branding }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: session } = useSession();
  const practiceType = session?.user?.practiceType;

  // Use org name if available, fall back to practice type label
  const displayLabel = branding?.name
    ?? (practiceType ? PRACTICE_LABELS[practiceType] : undefined);

  // ⌘K / Ctrl+K opens search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <header className="flex h-16 items-center bg-white px-4 sm:px-6 border-b-primary">
        {/* Hamburger - mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden mr-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Practice / org name */}
        {displayLabel && (
          <span
            className="text-xl font-bold text-indigo-600 truncate"
            style={branding?.primaryColor ? { color: branding.primaryColor } : undefined}
          >
            {displayLabel}
          </span>
        )}

        <div className="flex items-center gap-4 ml-auto">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:block">Search…</span>
            <kbd className="hidden sm:flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>

          {/* Notifications bell */}
          <NotificationsPanel />

          {/* Account menu */}
          <AccountMenu />
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

