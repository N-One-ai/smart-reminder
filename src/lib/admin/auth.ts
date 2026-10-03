// Server-only. This module reads admin_users via the service-role client
// (src/lib/supabase/admin.ts) — never import it from a Client Component or
// pass its result to one as a prop that's trusted beyond "what to render".
// The project has no `server-only` package installed (checked before
// adding this file); the enforced boundary is the same one every other
// server-only module here relies on — plain functions that are only ever
// called from Server Components, layouts, and Server Actions, never
// bundled for the browser because nothing client-side imports them.

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * True only if the currently authenticated user has a row in admin_users.
 * admin_users has RLS enabled with NO policies granted to `authenticated`
 * (see migration 0010) — it is unreadable through the normal session-scoped
 * client by design, so this check goes through the service-role client,
 * and only from here. Never derive this from anything the browser sends
 * (no email allowlist, no client-supplied flag) — the only input is the
 * user id resolved server-side from the session cookie.
 */
export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getIsAdmin]", error);
    return false; // fail closed on any unexpected error, never fail open
  }
  return data !== null;
}

/**
 * The actual admin authorization boundary — call this at the top of every
 * /admin page/layout AND every admin Server Action, not just once in the
 * layout. Server Actions are directly callable regardless of which page
 * rendered them, same reasoning already applied to parseReminderText in
 * lib/ai/actions.ts: reaching the layout once is not enough on its own.
 *
 * - No session at all -> redirect to /login (same UX as /app, /settings).
 * - Session exists but not an admin -> notFound() (404), not a redirect to
 *   /login and not an "access denied" page — a normal user hitting /admin
 *   should see exactly what they'd see for any other route that doesn't
 *   exist, not a page that confirms an admin area exists and that they're
 *   specifically excluded from it.
 */
export async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin();
  if (!isAdmin) notFound();
}
