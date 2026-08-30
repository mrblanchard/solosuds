"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  MessageSquare,
  Mail,
  CreditCard,
  Settings,
  LogOut,
  ClipboardList,
  HelpCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Paintbrush,
  Wrench,
  User,
} from "lucide-react";

type PracticeType = "THERAPY" | "SALON" | "MEDICAL" | "FITNESS" | "LESSONS" | "OTHER" | undefined;

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export const ALL_NAV: Record<string, NavItem> = {
  dashboard:  { href: "/dashboard",          label: "Dashboard",    icon: LayoutDashboard },
  schedule:   { href: "/dashboard/schedule", label: "Schedule",     icon: CalendarDays },
  clients:    { href: "/dashboard/clients",  label: "Clients",      icon: Users },
  notes:      { href: "/dashboard/notes",    label: "Notes",        icon: FileText },
  intake:     { href: "/dashboard/intake",   label: "Intake Forms", icon: ClipboardList },
  email:      { href: "/dashboard/email",    label: "Email",        icon: Mail },
  messages:   { href: "/dashboard/messages", label: "Messages",     icon: MessageSquare },
  billing:    { href: "/dashboard/billing",  label: "Billing",      icon: CreditCard },
  account:     { href: "/dashboard/account",      label: "Account",      icon: User },
  settings:    { href: "/dashboard/settings",     label: "Settings",     icon: Settings },
  whitelabel:  { href: "/dashboard/white-label",  label: "White Label",  icon: Paintbrush },
  faq:         { href: "/dashboard/faq",           label: "Help & FAQ",   icon: HelpCircle },
};

// Per-type nav order + optional label overrides
const NAV_CONFIG: Record<NonNullable<PracticeType>, { order: string[]; labels?: Partial<Record<string, string>> }> = {
  THERAPY: {
    order: ["dashboard", "schedule", "clients", "notes", "intake", "email", "messages", "billing", "account", "settings", "whitelabel", "faq"],
  },
  SALON: {
    order: ["dashboard", "schedule", "clients", "messages", "billing", "notes", "intake", "email", "account", "settings", "whitelabel", "faq"],
    labels: { notes: "Session Notes" },
  },
  MEDICAL: {
    order: ["dashboard", "clients", "intake", "notes", "schedule", "email", "messages", "billing", "account", "settings", "whitelabel", "faq"],
  },
  FITNESS: {
    order: ["dashboard", "schedule", "clients", "messages", "billing", "notes", "intake", "email", "account", "settings", "whitelabel", "faq"],
    labels: { notes: "Session Notes", intake: "Health Forms" },
  },
  LESSONS: {
    order: ["dashboard", "schedule", "clients", "messages", "billing", "notes", "intake", "email", "account", "settings", "whitelabel", "faq"],
    labels: { notes: "Session Notes" },
  },
  OTHER: {
    order: ["dashboard", "schedule", "clients", "notes", "intake", "email", "messages", "billing", "account", "settings", "whitelabel", "faq"],
  },
};

const PRACTICE_LABELS: Record<NonNullable<PracticeType>, string> = {
  THERAPY: "Therapy & Bodywork",
  SALON:   "Salon & Beauty",
  MEDICAL: "Medical Practice",
  FITNESS: "Fitness & Wellness",
  LESSONS: "Lessons & Tutoring",
  OTHER:   "General Practice",
};

type UserRole = "OWNER" | "ADMIN" | "PRACTITIONER" | "FRONT_DESK" | undefined;

// Items hidden per role (FRONT_DESK = Staff, PRACTITIONER = Editor)
export const ROLE_HIDDEN: Record<string, string[]> = {
  FRONT_DESK:    ["billing", "settings", "schedule", "whitelabel"],
  PRACTITIONER:  ["whitelabel"],
};

export function buildNav(practiceType: PracticeType, userRole?: UserRole): NavItem[] {
  const config = NAV_CONFIG[practiceType ?? "OTHER"];
  const hidden = ROLE_HIDDEN[userRole ?? ""] ?? [];
  return config.order
    .filter((key) => !hidden.includes(key))
    .map((key) => {
      const item = ALL_NAV[key];
      const labelOverride = config.labels?.[key];
      return labelOverride ? { ...item, label: labelOverride } : item;
    });
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  practiceType?: PracticeType;
  userRole?: UserRole;
  branding?: { name: string; logoUrl: string | null; primaryColor: string | null } | null;
  isAdmin?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/dev/subscribers", label: "Subscribers", icon: Wrench },
  { href: "/dev/leads", label: "Leads", icon: Wrench },
];

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
  practiceType,
  userRole,
  branding,
  isAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const navItems = buildNav(practiceType, userRole);

  const logoSrc = branding?.logoUrl ?? "/logo.png";
  const logoAlt = branding?.name ?? "SoloSuds";

  function sidebarContent({ mobile }: { mobile: boolean }) {
    const isCollapsed = !mobile && collapsed;
    return (
      <>
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b-primary",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src={logoSrc}
              alt={logoAlt}
              className={isCollapsed ? "h-8 w-auto shrink-0" : "h-10 w-auto shrink-0"}
            />
            {!isCollapsed && (
              <span className="truncate text-lg font-bold text-gray-800">{logoAlt}</span>
            )}
          </Link>
          {!isCollapsed && (
            mobile ? (
              <button
                onClick={onMobileClose}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onToggleCollapse}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )
          )}
          {isCollapsed && !mobile && (
            <button
              onClick={onToggleCollapse}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 overflow-y-auto py-4",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {navItems.map(({ href, label, icon: Icon, disabled }) => {
            const active = !disabled && (pathname === href || pathname.startsWith(href + "/"));
            if (disabled) {
              return (
                <span
                  key={href}
                  title={isCollapsed ? `${label} - Coming Soon` : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium cursor-default opacity-50",
                    isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                    "text-gray-400"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 text-gray-300" />
                  {!isCollapsed && <span>{label} <span className="text-xs">- Coming Soon</span></span>}
                </span>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                onClick={mobile ? onMobileClose : undefined}
                title={isCollapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-indigo-600" : "text-gray-400")} />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              {!isCollapsed && (
                <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Admin
                </p>
              )}
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={mobile ? onMobileClose : undefined}
                    title={isCollapsed ? label : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors",
                      isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-indigo-600" : "text-gray-400")} />
                    {!isCollapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex w-full items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors",
              isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
            )}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/30"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent({ mobile: true })}
      </aside>

      {/* Desktop sidebar — collapsible */}
      <aside
        className={cn(
          "hidden lg:flex h-full flex-col border-r border-gray-200 bg-white transition-[width] duration-200 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent({ mobile: false })}
      </aside>
    </>
  );
}

