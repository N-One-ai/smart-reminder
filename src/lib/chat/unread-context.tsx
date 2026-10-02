"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

interface UnreadContextValue {
  /** Total unread messages across every conversation, for the nav badge. */
  total: number;
  /** Optimistically zeroes a conversation's unread count — called right after last_read_at is persisted. */
  clearUnread: (conversationId: string) => void;
  /** Tells the provider which conversation (if any) is currently open on screen, so a message arriving
   * there isn't briefly counted as unread before the chat screen's own mark-as-read call catches up. */
  setActiveConversation: (conversationId: string | null) => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

/**
 * One global realtime subscription for the whole authenticated session,
 * mounted once at the app shell level (not per-page, not per-render) — see
 * app-shell.tsx. No `filter` is passed: Supabase Realtime still enforces
 * the same `messages` SELECT RLS policy per subscriber, so this client only
 * ever actually receives INSERT events for conversations it's a member of,
 * exactly like the per-conversation subscription in chat-screen.tsx already
 * relies on. Nothing here reads data RLS wouldn't already allow.
 */
export function UnreadMessagesProvider({
  currentUserId,
  initialUnreadByConversation,
  children,
}: {
  currentUserId: string;
  initialUnreadByConversation: Record<string, number>;
  children: React.ReactNode;
}) {
  const [unreadByConversation, setUnreadByConversation] = useState(initialUnreadByConversation);
  const seenMessageIdsRef = useRef(new Set<string>());
  const activeConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("unread-messages")
      .on<Database["public"]["Tables"]["messages"]["Row"]>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new;

          // Duplicate realtime delivery guard (reconnect/replay) — never
          // double-count the same message.
          if (seenMessageIdsRef.current.has(row.id)) return;
          seenMessageIdsRef.current.add(row.id);

          // Your own sent messages never count as unread for you.
          if (row.sender_id === currentUserId) return;

          // Already looking at this conversation — the chat screen's own
          // mark-as-read flow owns this case, don't flash the badge.
          if (row.conversation_id === activeConversationIdRef.current) return;

          setUnreadByConversation((prev) => ({
            ...prev,
            [row.conversation_id]: (prev[row.conversation_id] ?? 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const clearUnread = useCallback((conversationId: string) => {
    setUnreadByConversation((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationIdRef.current = conversationId;
  }, []);

  const total = useMemo(
    () => Object.values(unreadByConversation).reduce((sum, n) => sum + n, 0),
    [unreadByConversation]
  );

  const value = useMemo(
    () => ({ total, clearUnread, setActiveConversation }),
    [total, clearUnread, setActiveConversation]
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadMessages(): UnreadContextValue {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnreadMessages must be used within UnreadMessagesProvider");
  return ctx;
}
