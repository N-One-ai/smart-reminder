// Server-only, same convention as src/lib/admin/queries.ts: every exported
// function here re-verifies admin authorization itself via requireAdmin(),
// on top of whatever the admin layout already checked, and reads only via
// the service-role client (src/lib/supabase/admin.ts) — never imported by
// a Client Component.
//
// Deliberately NEVER selects reminders.title/description or any message/
// conversation content — every reminder/connection read here is either a
// head-count (`{ count: "exact", head: true }`) or, for the list page's
// per-row counts, a thin column-only select (just the foreign-key columns
// needed to tally per user), never a content column.

import { requireAdmin } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USERS_PAGE_SIZES, type AdminUsersPageSize } from "./constants";

export interface AdminUserListItem {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  remindersCount: number;
  connectionsCount: number;
}

export interface AdminUserListResult {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: AdminUsersPageSize;
}

function sanitizeSearchTerm(raw: string): string {
  // Strip characters that have special meaning in a PostgREST .or() filter
  // string (',' separates OR conditions, '(' / ')' group them) so a search
  // term can never be parsed as extra filter clauses on other columns —
  // these characters never appear in a legitimate name/username/email
  // search anyway. '%'/'_' (ILIKE wildcards) are escaped separately so a
  // search term is always treated as a literal substring, same convention
  // already used in lib/connections/actions.ts's searchUsers().
  return raw.replace(/[,()]/g, "").replace(/[%_]/g, (c) => `\\${c}`);
}

/**
 * Paginated, searchable user list for /admin/users. Search is always
 * server-side (PostgREST ILIKE against name/username/email) — the full
 * profiles table is never sent to the browser, only the current page.
 *
 * Per-row reminders/connections counts are computed from two extra
 * queries total (not one query per user): a single `select user_id` over
 * just this page's user ids, and a single `select requester_id,
 * receiver_id` the same way, tallied in memory. This stays O(1) in query
 * count regardless of page size, and never selects reminder content.
 */
export async function getAdminUsers({
  search,
  page = 1,
  pageSize = 20,
}: {
  search?: string;
  page?: number;
  pageSize?: AdminUsersPageSize;
}): Promise<AdminUserListResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = ADMIN_USERS_PAGE_SIZES.includes(pageSize) ? pageSize : 20;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = admin
    .from("profiles")
    .select("id, name, username, email, avatar_url, created_at", { count: "exact" });

  const trimmed = search?.trim();
  if (trimmed) {
    const pattern = `%${sanitizeSearchTerm(trimmed)}%`;
    query = query.or(`name.ilike.${pattern},username.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[getAdminUsers]", error);
    return { users: [], total: 0, page: safePage, pageSize: safePageSize };
  }

  const rows = data ?? [];
  const ids = rows.map((r) => r.id);

  const [remindersRes, connectionsRes] = await Promise.all([
    ids.length > 0
      ? admin.from("reminders").select("user_id").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string }[], error: null }),
    ids.length > 0
      ? admin
          .from("connections")
          .select("requester_id, receiver_id")
          .or(`requester_id.in.(${ids.join(",")}),receiver_id.in.(${ids.join(",")})`)
      : Promise.resolve({ data: [] as { requester_id: string; receiver_id: string }[], error: null }),
  ]);

  if (remindersRes.error) console.error("[getAdminUsers] reminders", remindersRes.error);
  if (connectionsRes.error) console.error("[getAdminUsers] connections", connectionsRes.error);

  const idSet = new Set(ids);

  const reminderCountByUser = new Map<string, number>();
  for (const r of remindersRes.data ?? []) {
    reminderCountByUser.set(r.user_id, (reminderCountByUser.get(r.user_id) ?? 0) + 1);
  }

  const connectionCountByUser = new Map<string, number>();
  for (const c of connectionsRes.data ?? []) {
    if (idSet.has(c.requester_id)) {
      connectionCountByUser.set(c.requester_id, (connectionCountByUser.get(c.requester_id) ?? 0) + 1);
    }
    if (idSet.has(c.receiver_id)) {
      connectionCountByUser.set(c.receiver_id, (connectionCountByUser.get(c.receiver_id) ?? 0) + 1);
    }
  }

  const users: AdminUserListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    username: r.username,
    email: r.email,
    avatarUrl: r.avatar_url,
    createdAt: r.created_at,
    remindersCount: reminderCountByUser.get(r.id) ?? 0,
    connectionsCount: connectionCountByUser.get(r.id) ?? 0,
  }));

  return { users, total: count ?? 0, page: safePage, pageSize: safePageSize };
}

export interface AdminUserDetail {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
  /** False if any stats query failed — the page must show "couldn't load
   * statistics" rather than render zeros that look like real counts. */
  statsAvailable: boolean;
  reminders: { total: number; pending: number; completed: number; shared: number; private: number };
  connections: { total: number; pending: number; accepted: number; rejected: number };
}

/**
 * Single-user detail: profile metadata (never email in bulk elsewhere, but
 * explicitly allowed here per the admin spec) + aggregate stats only. Never
 * selects reminders.title/description, metadata, or anything from
 * messages/conversations — returns null if the profile itself doesn't
 * exist, which the caller turns into notFound().
 */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, name, username, email, avatar_url, timezone, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[getAdminUserDetail] profile", profileError);
    return null;
  }
  if (!profile) return null;

  const [pendingRes, completedRes, sharedRes, pendingConnRes, acceptedConnRes, rejectedConnRes] =
    await Promise.all([
      admin.from("reminders").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
      admin.from("reminders").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
      admin
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("shared_with_user_id", "is", null),
      admin
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
      admin
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
      admin
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
    ]);

  const results = [pendingRes, completedRes, sharedRes, pendingConnRes, acceptedConnRes, rejectedConnRes];
  const statsAvailable = results.every((r) => !r.error);
  if (!statsAvailable) {
    for (const r of results) {
      if (r.error) console.error("[getAdminUserDetail] stats", r.error);
    }
  }

  const pending = pendingRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const shared = sharedRes.count ?? 0;
  const total = pending + completed;

  const pendingConn = pendingConnRes.count ?? 0;
  const acceptedConn = acceptedConnRes.count ?? 0;
  const rejectedConn = rejectedConnRes.count ?? 0;

  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    timezone: profile.timezone,
    createdAt: profile.created_at,
    statsAvailable,
    reminders: { total, pending, completed, shared, private: total - shared },
    connections: {
      total: pendingConn + acceptedConn + rejectedConn,
      pending: pendingConn,
      accepted: acceptedConn,
      rejected: rejectedConn,
    },
  };
}
