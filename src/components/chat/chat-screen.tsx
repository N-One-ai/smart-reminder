"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, MessageCircle, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markConversationRead } from "@/lib/chat/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import { useUnreadMessages } from "@/lib/chat/unread-context";
import type { Database } from "@/types/database";
import type { ChatMessage } from "@/types/chat";
import type { PublicProfile } from "@/types/profile";

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function ChatScreen({
  conversationId,
  currentUserId,
  otherUser,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  otherUser: PublicProfile;
  initialMessages: ChatMessage[];
}) {
  const dict = useDictionary();
  const router = useRouter();
  const { clearUnread, setActiveConversation } = useUnreadMessages();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [realtimeDown, setRealtimeDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initial = (otherUser.name || otherUser.username || "?").charAt(0).toUpperCase();

  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
    clearUnread(conversationId);
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clearUnread/setActiveConversation are stable (useCallback), re-running only on a real conversation change is intended
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on<Database["public"]["Tables"]["messages"]["Row"]>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                content: row.content,
                createdAt: row.created_at,
              },
            ];
          });
          if (row.sender_id !== currentUserId) {
            markConversationRead(conversationId).catch(() => {});
            clearUnread(conversationId);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeDown(true);
          toast.error(dict.chat.realtimeDisconnected);
        } else if (status === "SUBSCRIBED") {
          setRealtimeDown(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dict is stable-ish and re-subscribing on locale change isn't needed
  }, [conversationId, currentUserId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await sendMessage(conversationId, content);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
      setDraft("");
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border shrink-0">
        <button
          onClick={() => router.push("/app/connections")}
          aria-label={dict.chat.back}
          className="flex size-9 items-center justify-center rounded-full hover:bg-muted text-foreground shrink-0"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Avatar size="sm">
          {otherUser.avatar_url && <AvatarImage src={otherUser.avatar_url} alt={otherUser.name} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-sm font-semibold truncate">{otherUser.name || "?"}</span>
          {otherUser.username && <span className="text-xs text-muted-foreground truncate">@{otherUser.username}</span>}
        </div>
        {realtimeDown && <WifiOff className="size-4 text-muted-foreground shrink-0" />}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{dict.chat.emptyTitle}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{dict.chat.emptyDescription}</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn("flex flex-col max-w-[75%]", isMine ? "self-end items-end" : "self-start items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm text-balance break-words",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {formatMessageTime(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 px-3 py-3 border-t border-border shrink-0">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={dict.chat.composerPlaceholder}
          rows={1}
          maxLength={2000}
          className="resize-none text-base max-h-32"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label={dict.chat.send} className="shrink-0">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
