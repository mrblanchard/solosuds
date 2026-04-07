"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";

const COLLAPSED_KEY = "sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const practiceType = session?.user?.practiceType;
  const userRole = session?.user?.role;

  // Hydrate collapsed preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50/80">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        practiceType={practiceType}
        userRole={userRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex flex-1 flex-col overflow-y-auto overscroll-contain touch-auto">
          <div className="flex-1 pt-8 px-4 sm:px-6">
            {children}
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
