"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import SearchModal from "@/components/layout/search-modal";
import NotificationsPanel from "@/components/layout/notifications-panel";
import AccountMenu from "@/components/layout/account-menu";

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);

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
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
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

