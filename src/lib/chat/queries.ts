import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, ConversationSummary } from "@/types/chat";
import type { PublicProfile } from "@/types/profile";

/** Plain reads for Server Components — not Server Actions (those are for mutations). */

const MESSAGE_HISTORY_LIMIT = 100;

/**
 * Minimal, lightweight read of the `unread_message_counts` view (no join to
 * conversations/profiles) — keyed by conversation_id. Shared by the
 * Connections screen's per-row badges and the global nav badge seed, so the
 * "what counts as unread" logic lives in exactly one place (the view
 * itself, see migration 0006) rather than being re-derived per caller.
 */
export async function getUnreadCountsByConversation(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase.from("unread_message_counts").select("*");
  if (error) {
    console.error("[getUnreadCountsByConversation]", error);
    return {};
  }

  return Object.fromEntries((data ?? []).map((u) => [u.conversation_id, u.unread_count]));
}

/**
 * One row per conversation the current user belongs to, with the other
 * participant's public-safe profile and their unread count — everything
 * the Connections screen needs to show a "Chat" action with a badge.
 */
export async function getConversationSummaries(): Promise<Map<string, ConversationSummary>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const [{ data: conversations, error }, unreadByConversation] = await Promise.all([
    supabase.from("conversations").select("*").or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
    getUnreadCountsByConversation(),
  ]);

  if (error) {
    console.error("[getConversationSummaries] conversations", error);
    return new Map();
  }
  if (!conversations || conversations.length === 0) return new Map();

  const otherIdByConversation = new Map<string, string>();
  for (const c of conversations) {
    otherIdByConversation.set(c.id, c.user_a_id === user.id ? c.user_b_id : c.user_a_id);
  }

  const { data: profiles } = await supabase
    .from("profiles_public")
    .select("*")
    .in("id", [...otherIdByConversation.values()]);

  const profileById = new Map<string, PublicProfile>(
    (profiles ?? []).map((p) => [p.id, { id: p.id, name: p.name ?? "", username: p.username, avatar_url: p.avatar_url }])
  );

  const result = new Map<string, ConversationSummary>();
  for (const [conversationId, otherId] of otherIdByConversation) {
    const otherUser = profileById.get(otherId);
    if (!otherUser) continue;
    result.set(otherId, {
      conversationId,
      otherUser,
      unreadCount: unreadByConversation[conversationId] ?? 0,
    });
  }
  return result;
}

export interface ConversationDetail {
  conversationId: string;
  otherUser: PublicProfile;
  messages: ChatMessage[];
}

/** Returns null if the conversation doesn't exist or the caller isn't a member (RLS-backed, not leaked). */
export async function getConversationDetail(conversationId: string): Promise<ConversationDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convoError) {
    console.error("[getConversationDetail] conversation", convoError);
    throw new Error("Không thể tải cuộc trò chuyện. Vui lòng thử lại.");
  }
  if (!conversation) return null; // not found, or RLS hid it — same "not found" response either way

  const otherId = conversation.user_a_id === user.id ? conversation.user_b_id : conversation.user_a_id;

  const [{ data: otherProfile }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from("profiles_public").select("*").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_HISTORY_LIMIT),
  ]);

  if (messagesError) {
    console.error("[getConversationDetail] messages", messagesError);
    throw new Error("Không thể tải tin nhắn. Vui lòng thử lại.");
  }
  if (!otherProfile) return null;

  return {
    conversationId,
    otherUser: {
      id: otherProfile.id,
      name: otherProfile.name ?? "",
      username: otherProfile.username,
      avatar_url: otherProfile.avatar_url,
    },
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      attachmentType: m.attachment_type,
      attachmentPath: m.attachment_path,
      attachmentMimeType: m.attachment_mime_type,
      attachmentSize: m.attachment_size,
      createdAt: m.created_at,
    })),
  };
}
