"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarClock, CheckCircle2, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/locale-provider";
import { useUnreadMessages } from "@/lib/chat/unread-context";
import { RymiLogo } from "./rymi-logo";

export function NavBar({ pendingConnectionCount = 0 }: { pendingConnectionCount?: number }) {
  const pathname = usePathname();
  const dict = useDictionary();
  // Same badge slot as pending connection requests — a single combined
  // number for "things needing attention in Kết nối", not two separate
  // indicators crowding one icon.
  const { total: unreadMessageCount } = useUnreadMessages();
  const connectionsBadge = pendingConnectionCount + unreadMessageCount;

  const NAV_ITEMS = [
    { href: "/app", label: dict.nav.today, icon: CalendarCheck, badge: 0 },
    { href: "/app/upcoming", label: dict.nav.upcoming, icon: CalendarClock, badge: 0 },
    { href: "/app/completed", label: dict.nav.completed, icon: CheckCircle2, badge: 0 },
    { href: "/app/connections", label: dict.nav.connections, icon: Users, badge: connectionsBadge },
    { href: "/settings", label: dict.nav.settings, icon: Settings, badge: 0 },
  ] as const;

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
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex justify-center">
                <a
                  href={href}
                  aria-label={badge > 0 ? `${label} (${badge})` : label}
                  aria-current={active ? "page" : undefined}
                  className="relative flex items-center justify-center size-11"
                >
                  <Icon
                    className={cn(
                      "size-[21px] transition-colors duration-200",
                      active ? "text-sidebar-primary" : "text-sidebar-foreground"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-destructive" />
                  )}
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
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
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
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-[10px] font-semibold text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>
    </>
  );
}
