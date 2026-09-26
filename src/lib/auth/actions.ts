"use server";

import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/lib/action-result";

interface AuthResult {
  needsEmailConfirmation: boolean;
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult<AuthResult>> {
  if (!input.email.trim() || !input.password || input.password.length < 6) {
    return err("VALIDATION_ERROR", "Email và mật khẩu (tối thiểu 6 ký tự) là bắt buộc");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { name: input.name.trim() } },
  });

  if (error) {
    console.error("[signUp]", error);
    if (error.message.includes("already registered") || error.code === "user_already_exists") {
      return err("EMAIL_TAKEN", "Email này đã được đăng ký. Hãy thử đăng nhập.");
    }
    return err("AUTH_ERROR", "Không thể tạo tài khoản. Vui lòng thử lại.");
  }

  // If Supabase project requires email confirmation, `session` is null here.
  return ok({ needsEmailConfirmation: data.session === null });
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (error) {
    console.error("[signIn]", error);
    return err("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
  }

  return ok(null);
}

export async function signOut(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[signOut]", error);
    return err("AUTH_ERROR", "Không thể đăng xuất. Vui lòng thử lại.");
  }

  return ok(null);
}
