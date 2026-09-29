"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/lib/action-result";
import type { Profile } from "@/types/profile";

export async function updateProfile(input: {
  name?: string;
  timezone?: string;
  avatar_url?: string | null;
}): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url }),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[updateProfile]", error);
    return err("DB_ERROR", "Không thể lưu cài đặt. Vui lòng thử lại.");
  }

  revalidatePath("/settings");
  revalidatePath("/app");
  return ok({
    id: data.id,
    name: data.name ?? "",
    email: data.email,
    timezone: data.timezone,
    avatar_url: data.avatar_url,
    created_at: data.created_at,
  });
}
