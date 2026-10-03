import { createClient } from "@/lib/supabase/server";
import type { Reminder } from "@/types/reminder";
import type { PublicProfile } from "@/types/profile";
import { toReminder } from "./mapper";

/** Plain reads for Server Components — not Server Actions (those are for mutations). */

/**
 * Resolves the "other party" of every shared reminder in the list — the
 * recipient's profile if the viewer is the owner, the owner's profile if
 * the viewer is the recipient — for the "🔗 Với ..." line on the card.
 * Batches into a single profiles_public lookup rather than one query per
 * reminder. Mutates nothing in the DB; this is purely a display-layer join,
 * same pattern as lib/connections/queries.ts and lib/chat/queries.ts use
 * for resolving the "other user" of a connection/conversation.
 */
async function withSharedProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reminders: Reminder[],
  currentUserId: string
): Promise<Reminder[]> {
  const otherIds = new Set<string>();
  for (const r of reminders) {
    if (!r.shared_with_user_id) continue;
    otherIds.add(r.user_id === currentUserId ? r.shared_with_user_id : r.user_id);
  }
  if (otherIds.size === 0) return reminders;

  const { data: profiles, error } = await supabase
    .from("profiles_public")
    .select("*")
    .in("id", [...otherIds]);

  if (error) {
    console.error("[withSharedProfiles]", error);
    return reminders;
  }

  const profileById = new Map<string, PublicProfile>(
    (profiles ?? []).map((p) => [p.id, { id: p.id, name: p.name ?? "", username: p.username, avatar_url: p.avatar_url }])
  );

  return reminders.map((r) => {
    if (!r.shared_with_user_id) return r;
    const isSharedWithMe = r.user_id !== currentUserId;
    const otherId = isSharedWithMe ? r.user_id : r.shared_with_user_id;
    return { ...r, sharedWithUser: profileById.get(otherId) ?? null, isSharedWithMe };
  });
}

/**
 * Fetch every reminder relevant to [windowStart, windowEnd]: one-off reminders whose
 * own date falls in the window, plus ALL recurring reminders (any origin date) since
 * a recurring rule can still be producing occurrences inside the window regardless of
 * how long ago it was created. Occurrence expansion itself happens in
 * lib/reminder/recurrence.ts — this only narrows what we pull from the DB.
 *
 * Includes reminders the current user owns AND reminders shared WITH them
 * (see migration 0009) — RLS is still the actual authorization boundary;
 * this OR is what makes the app actually request the shared rows that RLS
 * already permits, rather than silently under-fetching them.
 */
export async function getRemindersForWindow(
  windowStart: string,
  windowEnd: string
): Promise<Reminder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .or(`user_id.eq.${user.id},shared_with_user_id.eq.${user.id}`)
    .or(`repeat_rule.not.is.null,and(date.gte.${windowStart},date.lte.${windowEnd})`);

  if (error) {
    console.error("[getRemindersForWindow]", error);
    // Never swallow a real DB/network error into an empty list — that reads to the
    // user as "all my reminders vanished" instead of "the app hit an error".
    // The nearest app/error.tsx boundary shows a retry UI for this.
    throw new Error("Không thể tải lời nhắc. Vui lòng thử lại.");
  }

  return withSharedProfiles(supabase, (data ?? []).map(toReminder), user.id);
}

export async function getCompletedReminders(): Promise<Reminder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .or(`user_id.eq.${user.id},shared_with_user_id.eq.${user.id}`)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[getCompletedReminders]", error);
    throw new Error("Không thể tải lời nhắc. Vui lòng thử lại.");
  }

  return withSharedProfiles(supabase, (data ?? []).map(toReminder), user.id);
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", id)
    .or(`user_id.eq.${user.id},shared_with_user_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    console.error("[getReminderById]", error);
    throw new Error("Không thể tải lời nhắc. Vui lòng thử lại.");
  }
  if (!data) return null; // genuinely doesn't exist (or belongs to another user) — not an error

  const [enriched] = await withSharedProfiles(supabase, [toReminder(data)], user.id);
  return enriched;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.name ?? "",
    timezone: profile?.timezone ?? "Asia/Ho_Chi_Minh",
    avatarUrl: profile?.avatar_url ?? null,
    username: profile?.username ?? null,
  };
}
