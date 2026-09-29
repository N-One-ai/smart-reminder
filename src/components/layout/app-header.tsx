"use client";

import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";

/**
 * On the Today dashboard ("/app"), the account avatar moves down into the
 * greeting row instead (see TodayView) — matching a "greeting card" layout
 * where the avatar sits inline with "Chào buổi tối / Tên" rather than in a
 * separate top bar. Every other page keeps the avatar here as usual.
 */
export function AppHeader({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  if (pathname === "/app") return null;

  return (
    <header className="flex items-center justify-end gap-3 px-4 py-3 sm:px-8">
      <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
    </header>
  );
}
