import { createClient } from "@/lib/supabase/server";
import type { ConnectionWithProfile } from "@/types/connection";
import type { PublicProfile } from "@/types/profile";

/** Plain reads for Server Components — not Server Actions (those are for mutations). */

/**
 * PostgREST embeds foreign keys against their literal target table
 * (`profiles`), which is locked down to "own row only" by RLS — embedding
 * would silently come back null for the other party. Instead: fetch the
 * connection rows (scoped correctly by RLS), then fetch the other party's
 * public-safe fields in a second pass from the `profiles_public` view,
 * and merge in application code.
 */
async function fetchPublicProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, PublicProfile>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("profiles_public").select("*").in("id", ids);
  if (error) {
    console.error("[fetchPublicProfiles]", error);
    return new Map();
  }

  return new Map((data ?? []).map((p) => [p.id, { id: p.id, name: p.name ?? "", username: p.username, avatar_url: p.avatar_url }]));
}

export async function getPendingRequestCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[getPendingRequestCount]", error);
    return 0;
  }
  return count ?? 0;
}

export async function getIncomingRequests(): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getIncomingRequests]", error);
    throw new Error("Không thể tải lời mời kết nối. Vui lòng thử lại.");
  }

  const rows = data ?? [];
  const profiles = await fetchPublicProfiles(
    supabase,
    rows.map((r) => r.requester_id)
  );

  return rows
    .map((row) => {
      const otherUser = profiles.get(row.requester_id);
      if (!otherUser) return null;
      const result: ConnectionWithProfile = {
        id: row.id,
        status: row.status,
        isRequester: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        otherUser,
      };
      return result;
    })
    .filter((x): x is ConnectionWithProfile => x !== null);
}

export async function getConnections(): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getConnections]", error);
    throw new Error("Không thể tải danh sách kết nối. Vui lòng thử lại.");
  }

  const rows = data ?? [];
  const otherIds = rows.map((r) => (r.requester_id === user.id ? r.receiver_id : r.requester_id));
  const profiles = await fetchPublicProfiles(supabase, otherIds);

  return rows
    .map((row) => {
      const otherId = row.requester_id === user.id ? row.receiver_id : row.requester_id;
      const otherUser = profiles.get(otherId);
      if (!otherUser) return null;
      const result: ConnectionWithProfile = {
        id: row.id,
        status: row.status,
        isRequester: row.requester_id === user.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        otherUser,
      };
      return result;
    })
    .filter((x): x is ConnectionWithProfile => x !== null);
}
