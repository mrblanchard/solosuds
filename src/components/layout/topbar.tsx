"use client";

import { useSession } from "next-auth/react";
import { Bell, Search } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {title && (
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      )}
      <div className="flex items-center gap-4 ml-auto">
        <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <Search className="h-4 w-4" />
          <span className="hidden sm:block">Search…</span>
          <kbd className="hidden sm:block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">⌘K</kbd>
        </button>
        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          {session?.user?.name ? getInitials(session.user.name) : "?"}
        </div>
      </div>
    </header>
  );
}
