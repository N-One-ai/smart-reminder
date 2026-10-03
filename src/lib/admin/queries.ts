// Server-only. One loader for the whole Dashboard (Section 9 of the spec:
// "prefer one server-side dashboard data loader rather than many
// browser-side requests") — the admin page calls this once, server-side,
// and every number on the page comes from this single return value. No
// Client Component in this feature ever fetches admin data directly.

import { requireAdmin } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ConnectionCounts {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

export interface ReminderCounts {
  total: number;
  pending: number;
  completed: number;
  shared: number;
  private: number;
  aiCreated: number;
  manualCreated: number;
}

export interface RegistrationDay {
  /** "YYYY-MM-DD", UTC calendar day — see getDashboardData()'s comment on
   * why UTC was chosen over the product's per-user timezone. */
  date: string;
  count: number;
}

export interface RecentUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  createdAt: string;
}

export interface DashboardData {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  reminders: ReminderCounts;
  connections: ConnectionCounts;
  registrationTrend: RegistrationDay[];
  recentUsers: RecentUser[];
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The single Dashboard data loader. requireAdmin() is called here too, not
 * only in the layout — Section 13's requirement that every admin data path
 * independently re-verifies authorization, since this function could in
 * principle be called from a future Server Action that doesn't happen to
 * render through the layout.
 *
 * Day boundaries (today/this week/this month, and the 30-day trend) are
 * computed in UTC. The product's per-user "civil date" concept (see
 * lib/reminder/*) is deliberately per-user-timezone for reminders
 * themselves, but there is no single meaningful timezone for a cross-user
 * admin aggregate — UTC is the least-surprising, most auditable choice
 * here, not a precise match to any one user's "today". This is called out
 * again in the final report as a known limitation.
 */
export async function getDashboardData(): Promise<DashboardData> {
  await requireAdmin();
  const admin = createAdminClient();

  const now = new Date();
  const todayStart = startOfUTCDay(now);

  // ISO week: Monday start. getUTCDay() is 0=Sun..6=Sat.
  const isoDayOffset = (now.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - isoDayOffset);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const trendStart = new Date(todayStart);
  trendStart.setUTCDate(trendStart.getUTCDate() - 29); // 30 days inclusive of today

  const [
    totalUsersRes,
    newTodayRes,
    newWeekRes,
    newMonthRes,
    totalRemindersRes,
    sharedRemindersRes,
    pendingRemindersRes,
    completedRemindersRes,
    aiRemindersRes,
    manualRemindersRes,
    totalConnRes,
    pendingConnRes,
    acceptedConnRes,
    rejectedConnRes,
    trendRes,
    recentUsersRes,
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    admin.from("reminders").select("*", { count: "exact", head: true }),
    admin.from("reminders").select("*", { count: "exact", head: true }).not("shared_with_user_id", "is", null),
    admin.from("reminders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("reminders").select("*", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("reminders").select("*", { count: "exact", head: true }).eq("source", "ai"),
    admin.from("reminders").select("*", { count: "exact", head: true }).eq("source", "manual"),
    admin.from("connections").select("*", { count: "exact", head: true }),
    admin.from("connections").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("connections").select("*", { count: "exact", head: true }).eq("status", "accepted"),
    admin.from("connections").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    // Only created_at for rows already bounded to the last 30 days — one
    // query, not thirty, and never the whole profiles table.
    admin.from("profiles").select("created_at").gte("created_at", trendStart.toISOString()),
    admin
      .from("profiles")
      .select("id, name, username, email, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  for (const [label, res] of [
    ["totalUsers", totalUsersRes],
    ["newToday", newTodayRes],
    ["newWeek", newWeekRes],
    ["newMonth", newMonthRes],
    ["totalReminders", totalRemindersRes],
    ["sharedReminders", sharedRemindersRes],
    ["pendingReminders", pendingRemindersRes],
    ["completedReminders", completedRemindersRes],
    ["aiReminders", aiRemindersRes],
    ["manualReminders", manualRemindersRes],
    ["totalConnections", totalConnRes],
    ["pendingConnections", pendingConnRes],
    ["acceptedConnections", acceptedConnRes],
    ["rejectedConnections", rejectedConnRes],
    ["trend", trendRes],
    ["recentUsers", recentUsersRes],
  ] as const) {
    if (res.error) console.error(`[getDashboardData] ${label}`, res.error);
  }

  const totalReminders = totalRemindersRes.count ?? 0;
  const sharedReminders = sharedRemindersRes.count ?? 0;

  // Bucket the 30-day trend by UTC calendar day, zero-filled for days with
  // no registrations at all (per spec: "If there are no users on a
  // particular day, show 0").
  const bucket = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(trendStart);
    d.setUTCDate(d.getUTCDate() + i);
    bucket.set(toDateKey(d), 0);
  }
  for (const row of trendRes.data ?? []) {
    const key = toDateKey(new Date(row.created_at));
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  const registrationTrend: RegistrationDay[] = [...bucket.entries()].map(([date, count]) => ({ date, count }));

  const recentUsers: RecentUser[] = (recentUsersRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    createdAt: u.created_at,
  }));

  return {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersToday: newTodayRes.count ?? 0,
    newUsersThisWeek: newWeekRes.count ?? 0,
    newUsersThisMonth: newMonthRes.count ?? 0,
    reminders: {
      total: totalReminders,
      pending: pendingRemindersRes.count ?? 0,
      completed: completedRemindersRes.count ?? 0,
      shared: sharedReminders,
      private: totalReminders - sharedReminders,
      aiCreated: aiRemindersRes.count ?? 0,
      manualCreated: manualRemindersRes.count ?? 0,
    },
    connections: {
      total: totalConnRes.count ?? 0,
      pending: pendingConnRes.count ?? 0,
      accepted: acceptedConnRes.count ?? 0,
      rejected: rejectedConnRes.count ?? 0,
    },
    registrationTrend,
    recentUsers,
  };
}
