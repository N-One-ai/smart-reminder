"use client";

import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "./admin-sidebar";

/**
 * Mobile-only top bar — the sidebar itself is desktop-only
 * (`hidden md:flex`), so small screens need at least a page title and a
 * way back; full mobile admin nav is out of scope for this phase (admin
 * is explicitly desktop-first per the spec).
 */
export function AdminHeader() {
  const pathname = usePathname();
  const title = ADMIN_NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Admin";

  return (
    <header className="md:hidden flex items-center justify-between border-b px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Rymi Admin</span>
        <h1 className="text-sm font-semibold">{title}</h1>
      </div>
      <a href="/app" className="text-xs text-muted-foreground underline">
        Back to Rymi
      </a>
    </header>
  );
}
