import type { PublicProfile } from "./profile";
import type { AttachmentType } from "./database";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  attachmentType: AttachmentType | null;
  /** Never a usable URL by itself — the Storage path, only ever resolved
   * to a short-lived signed URL via getAttachmentUrl(messageId). */
  attachmentPath: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
  createdAt: string;
}

export interface ConversationSummary {
  conversationId: string;
  otherUser: PublicProfile;
  unreadCount: number;
}
