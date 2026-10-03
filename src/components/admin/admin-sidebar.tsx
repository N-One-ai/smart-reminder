"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  UserPlus,
  CalendarCheck,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/registrations", label: "Registrations", icon: TrendingUp },
  { href: "/admin/connections", label: "Connections", icon: UserPlus },
  { href: "/admin/reminders", label: "Reminders", icon: CalendarCheck },
  { href: "/admin/members", label: "Members", icon: CreditCard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

/**
 * Plain <a> tags, not next/link — same reasoning as the main app's NavBar:
 * admin data must always reflect a fresh server-side read (and re-run
 * requireAdmin()), not a client-cached RSC navigation.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:min-h-svh md:py-6 md:px-4 md:gap-1 md:bg-sidebar">
      <div className="px-3 pb-8 flex flex-col text-white">
        <span className="font-heading text-base font-bold leading-tight">Rymi</span>
        <span className="text-xs text-sidebar-foreground">Admin</span>
      </div>
      {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4.5" strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
          </a>
        );
      })}
      <div className="mt-auto pt-4">
        <a
          href="/app"
          className="block rounded-2xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          ← Back to Rymi
        </a>
      </div>
    </nav>
  );
}
