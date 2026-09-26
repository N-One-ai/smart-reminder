"use server";

import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/lib/action-result";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Upserts by endpoint so re-subscribing the same browser doesn't duplicate rows. */
export async function subscribePush(input: PushSubscriptionInput): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[subscribePush]", error);
    return err("DB_ERROR", "Không thể bật thông báo đẩy. Vui lòng thử lại.");
  }

  return ok(null);
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[unsubscribePush]", error);
    return err("DB_ERROR", "Không thể tắt thông báo đẩy. Vui lòng thử lại.");
  }

  return ok(null);
}
