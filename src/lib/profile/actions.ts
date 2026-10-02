"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, type ActionResult } from "@/lib/action-result";
import type { Profile } from "@/types/profile";

const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024;

/** Must match the `profiles_username_format` check constraint in the DB. */
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

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
    username: data.username,
    created_at: data.created_at,
  });
}

/**
 * Separate from updateProfile — username has its own validation shape and a
 * uniqueness conflict is a normal, expected outcome (not a generic DB_ERROR),
 * so it needs its own distinct error code the UI can branch on.
 */
export async function updateUsername(rawUsername: string): Promise<ActionResult<{ username: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const username = rawUsername.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return err(
      "INVALID_USERNAME",
      "Username phải dài 3-20 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới."
    );
  }

  const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);

  if (error) {
    // Postgres unique_violation
    if (error.code === "23505") {
      return err("USERNAME_TAKEN", "Username này đã có người dùng. Hãy chọn username khác.");
    }
    console.error("[updateUsername]", error);
    return err("DB_ERROR", "Không thể lưu username. Vui lòng thử lại.");
  }

  revalidatePath("/settings");
  revalidatePath("/app/connections");
  return ok({ username });
}

/**
 * Uploads via the service-role admin client rather than the browser's
 * session-scoped client, deliberately bypassing storage.objects RLS. Safe
 * here because the write target is derived server-side from the verified
 * session user (never client input) and hard-scoped to that user's own
 * folder — the same guarantee the RLS policy would have enforced, just
 * checked in code instead of in Postgres.
 */
export async function uploadAvatar(formData: FormData): Promise<ActionResult<{ avatarUrl: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const file = formData.get("file");
  if (!(file instanceof Blob)) return err("INVALID_INPUT", "Không có ảnh nào được chọn.");
  if (file.size > MAX_AVATAR_FILE_BYTES) return err("INVALID_INPUT", "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.");

  const admin = createAdminClient();
  const path = `${user.id}/avatar.jpg`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { upsert: true, contentType: "image/jpeg" });
  if (uploadError) {
    console.error("[uploadAvatar] storage upload failed", uploadError);
    return err("STORAGE_ERROR", "Không thể tải ảnh lên. Vui lòng thử lại.");
  }

  const { data: publicUrlData } = admin.storage.from("avatars").getPublicUrl(path);
  // Cache-bust — the path is stable (upsert), so without this the browser/
  // CDN would keep serving the previous image after a re-upload.
  const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  const result = await updateProfile({ avatar_url: avatarUrl });
  if (!result.ok) return result;

  return ok({ avatarUrl });
}
