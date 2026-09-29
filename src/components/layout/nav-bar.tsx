"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarClock, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { RymiLogo } from "./rymi-logo";

const NAV_ITEMS = [
  { href: "/app", label: "Hôm nay", icon: CalendarCheck },
  { href: "/app/upcoming", label: "Sắp tới", icon: CalendarClock },
  { href: "/app/completed", label: "Hoàn thành", icon: CheckCircle2 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
] as const;

export function NavBar() {
  const pathname = usePathname();

  // Plain <a> tags (full page navigation), not next/link — the reminder list
  // must always reflect the database exactly, and Next.js's client-side RSC
  // navigation could occasionally race (two overlapping navigations landing
  // out of order) and show a stale/empty snapshot for a couple of seconds
  // before self-correcting. A full navigation has no such race: every tab
  // switch is a clean, single server round-trip. Worth the small loss of
  // "instant" SPA transitions for guaranteed data correctness here.
  return (
    <>
      {/* Mobile: floating bottom tab bar — icon-only, no label/no active shape (2-tone identity via icon color alone) */}
      <nav className="sm:hidden fixed bottom-3 inset-x-3 z-40 rounded-3xl bg-sidebar shadow-lg shadow-black/20 px-2 py-2">
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex justify-center">
                <a
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center justify-center size-11"
                >
                  <Icon
                    className={cn(
                      "size-[21px] transition-colors duration-200",
                      active ? "text-sidebar-primary" : "text-sidebar-foreground"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop / tablet: side nav — same black chrome, neon active pill */}
      <nav className="hidden sm:flex sm:flex-col sm:w-60 sm:shrink-0 sm:min-h-svh sm:py-6 sm:px-4 sm:gap-1 sm:bg-sidebar">
        <a href="/app" aria-label="Rymi" className="px-3 pb-8 flex items-center text-white">
          <RymiLogo className="h-6 w-auto" />
        </a>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
              {label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
