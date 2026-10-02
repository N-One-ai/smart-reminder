import type { PublicProfile } from "./profile";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ConversationSummary {
  conversationId: string;
  otherUser: PublicProfile;
  unreadCount: number;
}
