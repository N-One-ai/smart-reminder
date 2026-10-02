"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/lib/action-result";
import type { ChatMessage } from "@/types/chat";

const GENERIC_ERROR = "Không thể thực hiện thao tác. Vui lòng thử lại.";
const MAX_MESSAGE_LENGTH = 2000;

/**
 * The only way a conversation gets created — delegates the actual
 * connection check to get_or_create_conversation (SECURITY DEFINER, see
 * migration 0006), so a user can't open a chat with someone they aren't
 * an accepted connection with by guessing an id or editing the request.
 */
export async function getOrCreateConversation(otherUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");
  if (user.id === otherUserId) return err("INVALID_INPUT", "Bạn không thể trò chuyện với chính mình.");

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_user_id: otherUserId,
  });

  if (error || !data) {
    console.error("[getOrCreateConversation]", error);
    if (error?.message?.includes("not connected")) {
      return err("NOT_CONNECTED", "Bạn cần kết nối với người này trước khi trò chuyện.");
    }
    return err("DB_ERROR", GENERIC_ERROR);
  }

  return ok({ conversationId: data });
}

export async function sendMessage(conversationId: string, rawContent: string): Promise<ActionResult<ChatMessage>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const content = rawContent.trim();
  if (!content) return err("INVALID_INPUT", "Vui lòng nhập nội dung tin nhắn.");
  if (content.length > MAX_MESSAGE_LENGTH) {
    return err("INVALID_INPUT", "Tin nhắn quá dài. Vui lòng rút ngắn lại.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content })
    .select()
    .single();

  if (error || !data) {
    console.error("[sendMessage]", error);
    // RLS silently returns zero rows (no explicit "forbidden" error) when the
    // caller isn't a member of the conversation — same message either way,
    // since distinguishing them would confirm/deny the conversation's
    // existence to someone who shouldn't know either way.
    return err("DB_ERROR", "Không thể gửi tin nhắn. Vui lòng thử lại.");
  }

  revalidatePath(`/app/chat/${conversationId}`);
  revalidatePath("/app/connections");
  return ok({
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    content: data.content,
    createdAt: data.created_at,
  });
}

export async function markConversationRead(conversationId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[markConversationRead]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }

  revalidatePath("/app/connections");
  return ok(null);
}
