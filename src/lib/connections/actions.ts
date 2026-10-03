"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/lib/action-result";
import type { ConnectionStatus, Database } from "@/types/database";
import type { ConnectionWithProfile, UserSearchResult } from "@/types/connection";
import { getConnections } from "./queries";

const GENERIC_ERROR = "Không thể thực hiện thao tác. Vui lòng thử lại.";
const SEARCH_RESULT_LIMIT = 20;

/**
 * Thin "use server" wrapper around the plain getConnections() read, so
 * Client Components (e.g. the reminder share picker, which has no
 * convenient Server Component ancestor to pass this down as a prop from)
 * can fetch the caller's own accepted Connections directly. No new query
 * logic — reuses the exact same read already used by the Connections
 * screen.
 */
export async function getMyConnections(): Promise<ActionResult<ConnectionWithProfile[]>> {
  try {
    const connections = await getConnections();
    return ok(connections);
  } catch (error) {
    console.error("[getMyConnections]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }
}

/**
 * Debounced + min-length-gated on the client (see search-bar.tsx) — this is
 * the actual server/database-side search itself, never a full table fetched
 * client-side and filtered in the browser.
 */
export async function searchUsers(rawQuery: string): Promise<ActionResult<UserSearchResult[]>> {
  const query = rawQuery.trim().replace(/^@/, "");
  if (query.length < 2) return ok([]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  // Two plain .ilike() calls instead of a single .or() — PostgREST's `.or()`
  // takes a raw comma-separated filter string, which would need its own
  // escaping on top of the SQL LIKE escaping below; merging two clean
  // queries in code avoids stacking both escaping schemes.
  const likePattern = `%${query.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const [byUsername, byName] = await Promise.all([
    supabase.from("profiles_public").select("*").ilike("username", likePattern).limit(SEARCH_RESULT_LIMIT),
    supabase.from("profiles_public").select("*").ilike("name", likePattern).limit(SEARCH_RESULT_LIMIT),
  ]);

  if (byUsername.error || byName.error) {
    console.error("[searchUsers]", byUsername.error ?? byName.error);
    return err("DB_ERROR", "Không thể tìm kiếm. Vui lòng thử lại.");
  }

  type PublicProfileRow = Database["public"]["Views"]["profiles_public"]["Row"];
  const seen = new Map<string, PublicProfileRow>();
  for (const row of [...(byUsername.data ?? []), ...(byName.data ?? [])]) {
    seen.set(row.id, row);
  }
  const results = [...seen.values()].slice(0, SEARCH_RESULT_LIMIT);

  // Small by nature (one user's own connections) — fetch them all and match
  // against the search results in memory rather than building a nested
  // AND/OR filter string for what's a tiny lookup either way.
  const { data: myConnections } = await supabase
    .from("connections")
    .select("*")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  const statusByOtherId = new Map<
    string,
    { id: string; status: ConnectionStatus; isRequester: boolean }
  >();
  for (const conn of myConnections ?? []) {
    const otherId = conn.requester_id === user.id ? conn.receiver_id : conn.requester_id;
    statusByOtherId.set(otherId, { id: conn.id, status: conn.status, isRequester: conn.requester_id === user.id });
  }

  return ok(
    results.map((r) => {
      const match = statusByOtherId.get(r.id);
      const result: UserSearchResult = {
        id: r.id,
        name: r.name ?? "",
        username: r.username,
        avatar_url: r.avatar_url,
        connectionStatus: match?.status ?? null,
        isRequester: match?.isRequester ?? null,
        connectionId: match?.id ?? null,
      };
      return result;
    })
  );
}

export async function sendConnectionRequest(
  targetUserId: string
): Promise<ActionResult<{ status: "pending" | "accepted"; isRequester: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");
  if (user.id === targetUserId) return err("INVALID_INPUT", "Bạn không thể kết nối với chính mình.");

  // All of "create new / re-open a rejected row / no-op if already
  // pending-or-accepted" lives in this one DB function so the ownership
  // checks only need to exist in one place (see migration 0005).
  const { data, error } = await supabase.rpc("send_connection_request", {
    target_user_id: targetUserId,
  });

  if (error || !data) {
    console.error("[sendConnectionRequest]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }

  revalidatePath("/app/connections");
  return ok({
    status: data.status as "pending" | "accepted",
    isRequester: data.requester_id === user.id,
  });
}

export async function acceptConnectionRequest(connectionId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  // RLS ("receiver can respond to a pending request") already scopes this to
  // rows where receiver_id = auth.uid() and status = 'pending', and the
  // column grant restricts the update to `status` alone — the .eq() here is
  // belt-and-suspenders, not the actual enforcement boundary.
  const { error, count } = await supabase
    .from("connections")
    .update({ status: "accepted" }, { count: "exact" })
    .eq("id", connectionId)
    .eq("receiver_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[acceptConnectionRequest]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }
  if (!count) return err("NOT_FOUND", "Lời mời này không còn tồn tại.");

  revalidatePath("/app/connections");
  return ok(null);
}

export async function rejectConnectionRequest(connectionId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error, count } = await supabase
    .from("connections")
    .update({ status: "rejected" }, { count: "exact" })
    .eq("id", connectionId)
    .eq("receiver_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[rejectConnectionRequest]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }
  if (!count) return err("NOT_FOUND", "Lời mời này không còn tồn tại.");

  revalidatePath("/app/connections");
  return ok(null);
}

export async function removeConnection(connectionId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error, count } = await supabase
    .from("connections")
    .delete({ count: "exact" })
    .eq("id", connectionId)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  if (error) {
    console.error("[removeConnection]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }
  if (!count) return err("NOT_FOUND", "Không tìm thấy kết nối này.");

  revalidatePath("/app/connections");
  return ok(null);
}
