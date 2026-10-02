"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, type ActionResult } from "@/lib/action-result";
import type { ChatMessage } from "@/types/chat";

const GENERIC_ERROR = "Không thể thực hiện thao tác. Vui lòng thử lại.";
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const CHAT_IMAGES_BUCKET = "chat-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Server-verified MIME type -> safe extension. Never derived from the
 * client-supplied filename. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Lightweight file-signature ("magic bytes") check — confirms the file's
 * actual binary content matches the claimed MIME type, without trusting
 * the browser-supplied `file.type` and without adding an external
 * sniffing library. Covers exactly the 3 formats this feature supports;
 * not a general-purpose file-type detector.
 */
function sniffImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function assertConversationMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string
): Promise<boolean> {
  // Reuses the exact same authorization source as the rest of chat (RLS on
  // conversation_members via is_conversation_member(), see 0007) rather
  // than a second, parallel membership check — this SELECT only returns a
  // row if the RLS policy already says `userId` belongs here.
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

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
    attachmentType: data.attachment_type,
    attachmentPath: data.attachment_path,
    attachmentMimeType: data.attachment_mime_type,
    attachmentSize: data.attachment_size,
    createdAt: data.created_at,
  });
}

/**
 * Uploads via the service-role admin client — same pattern as
 * uploadAvatar() in lib/profile/actions.ts — but the write target here is
 * additionally gated by assertConversationMember() first, since the
 * conversation_id comes from the client and there's no column-grant
 * equivalent for "which folder" the way there is for "which column".
 * Browsers never receive a bucket name, a storage path, or service-role
 * credentials — only the finished message back from this action.
 */
export async function sendImageMessage(
  conversationId: string,
  formData: FormData,
  rawCaption?: string
): Promise<ActionResult<ChatMessage>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const isMember = await assertConversationMember(supabase, conversationId, user.id);
  if (!isMember) return err("NOT_FOUND", "Không tìm thấy cuộc trò chuyện này.");

  const file = formData.get("file");
  if (!(file instanceof Blob)) return err("INVALID_INPUT", "Vui lòng chọn một ảnh.");
  if (file.size > MAX_IMAGE_BYTES) return err("INVALID_INPUT", "Ảnh quá lớn. Kích thước tối đa là 10MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffedMimeType = sniffImageMimeType(bytes);
  if (!sniffedMimeType) {
    return err("INVALID_INPUT", "Định dạng ảnh không được hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.");
  }
  // Belt-and-suspenders: the browser's own `file.type` must agree with what
  // the bytes actually are — a mismatch (e.g. a renamed .exe with a faked
  // client-side type) is rejected rather than trusted either way.
  if (file.type && file.type !== sniffedMimeType) {
    return err("INVALID_INPUT", "Định dạng ảnh không được hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.");
  }

  const extension = EXTENSION_BY_MIME[sniffedMimeType];
  const path = `${conversationId}/${crypto.randomUUID()}.${extension}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(CHAT_IMAGES_BUCKET)
    .upload(path, bytes, { contentType: sniffedMimeType });

  if (uploadError) {
    console.error("[sendImageMessage] storage upload failed", uploadError);
    return err("STORAGE_ERROR", "Không thể tải ảnh lên. Vui lòng thử lại.");
  }

  const caption = rawCaption?.trim() || null;
  if (caption && caption.length > MAX_MESSAGE_LENGTH) {
    return err("INVALID_INPUT", "Chú thích quá dài. Vui lòng rút ngắn lại.");
  }

  const { data, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: caption,
      attachment_type: "image",
      attachment_path: path,
      attachment_mime_type: sniffedMimeType,
      attachment_size: file.size,
    })
    .select()
    .single();

  if (insertError || !data) {
    console.error("[sendImageMessage] insert failed", insertError);
    // Clean up the now-orphaned object rather than leaving an unreferenced
    // file behind — best-effort, failure here doesn't change the response.
    await admin.storage.from(CHAT_IMAGES_BUCKET).remove([path]).catch(() => {});
    return err("DB_ERROR", "Không thể gửi ảnh. Vui lòng thử lại.");
  }

  revalidatePath(`/app/chat/${conversationId}`);
  revalidatePath("/app/connections");
  return ok({
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    content: data.content,
    attachmentType: data.attachment_type,
    attachmentPath: data.attachment_path,
    attachmentMimeType: data.attachment_mime_type,
    attachmentSize: data.attachment_size,
    createdAt: data.created_at,
  });
}

/**
 * The ONLY way a browser ever resolves an image message to something it can
 * display — it supplies a messageId, nothing else. Authorization is proven
 * by successfully reading the message row through the normal RLS-scoped
 * client (the existing "view messages in own conversations" policy, see
 * 0006): if that SELECT returns nothing, the caller is not a member and
 * this returns NOT_FOUND without ever touching Storage. Only after that
 * check passes does the admin client generate a short-lived signed URL —
 * never a permanent public URL, never a client-supplied path.
 */
export async function getAttachmentUrl(messageId: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { data: message, error } = await supabase
    .from("messages")
    .select("attachment_path, attachment_type, conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    console.error("[getAttachmentUrl]", error);
    return err("DB_ERROR", GENERIC_ERROR);
  }
  if (!message || message.attachment_type !== "image" || !message.attachment_path) {
    return err("NOT_FOUND", "Không tìm thấy ảnh này.");
  }

  // Defense-in-depth: the messages INSERT policy only validates sender_id
  // and conversation membership, not any relationship between
  // attachment_path and conversation_id — nothing stops a member of
  // conversation X from directly INSERTing a row (bypassing
  // sendImageMessage entirely, e.g. via a raw PostgREST call) with
  // conversation_id = X but attachment_path pointing into conversation Y's
  // folder. Since every legitimately-uploaded path is always
  // `${conversationId}/${uuid}.${ext}` (see sendImageMessage above), a path
  // that doesn't start with this message's own conversation_id could only
  // get here through exactly that kind of forged row — reject it before a
  // signed URL is ever generated, rather than trusting the column blindly.
  if (!message.attachment_path.startsWith(`${message.conversation_id}/`)) {
    console.error("[getAttachmentUrl] attachment_path does not belong to its own conversation_id", {
      messageId,
      conversationId: message.conversation_id,
    });
    return err("NOT_FOUND", "Không tìm thấy ảnh này.");
  }

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from(CHAT_IMAGES_BUCKET)
    .createSignedUrl(message.attachment_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) {
    console.error("[getAttachmentUrl] sign failed", signError);
    return err("STORAGE_ERROR", "Không thể tải ảnh. Vui lòng thử lại.");
  }

  return ok({ url: signed.signedUrl });
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
