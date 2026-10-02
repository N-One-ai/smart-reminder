"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, MessageCircle, WifiOff, ImagePlus, X, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, sendImageMessage, getAttachmentUrl, markConversationRead } from "@/lib/chat/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import { useUnreadMessages } from "@/lib/chat/unread-context";
import { EmojiPicker } from "./emoji-picker";
import { ImageLightbox } from "./image-lightbox";
import type { Database } from "@/types/database";
import type { ChatMessage } from "@/types/chat";
import type { PublicProfile } from "@/types/profile";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Resolves an image message's private Storage path to a short-lived signed
 * URL, lazily, once per mount — never a path or bucket name reaches here. */
function ImageBubbleContent({ message, onOpen }: { message: ChatMessage; onOpen: (url: string) => void }) {
  const dict = useDictionary();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Each image message renders its own ImageBubbleContent instance keyed
    // by message.id (see the `key={m.id}` on the parent list item), so this
    // effect only ever runs once per mount — no need to reset state for a
    // "changed" id that can't actually occur here.
    getAttachmentUrl(message.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setUrl(res.data.url);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [message.id]);

  if (failed) {
    return (
      <div className="flex items-center justify-center gap-2 w-48 h-36 rounded-xl bg-muted text-muted-foreground text-xs">
        <ImageOff className="size-4" />
        {dict.chat.loadImageFailed}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center w-48 h-36 rounded-xl bg-muted">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(url)} className="block">
      {/* eslint-disable-next-line @next/next/no-img-element -- transient signed URL for a private attachment */}
      <img src={url} alt={dict.chat.imageAlt} className="max-w-56 max-h-72 rounded-xl object-cover" />
    </button>
  );
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
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [realtimeDown, setRealtimeDown] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Release the local object URL used for the pre-send preview once it's no
  // longer needed, so we don't leak memory across repeated selects/cancels.
  useEffect(() => {
    return () => {
      if (selectedImage) URL.revokeObjectURL(selectedImage.previewUrl);
    };
  }, [selectedImage]);

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
                attachmentType: row.attachment_type,
                attachmentPath: row.attachment_path,
                attachmentMimeType: row.attachment_mime_type,
                attachmentSize: row.attachment_size,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dict/clearUnread are stable-ish and re-subscribing on locale change isn't needed
  }, [conversationId, currentUserId]);

  function insertEmoji(emoji: string) {
    const pos = cursorPos ?? draft.length;
    const next = draft.slice(0, pos) + emoji + draft.slice(pos);
    setDraft(next);
    const nextPos = pos + emoji.length;
    setCursorPos(nextPos);
    // Keep focus + caret in the composer after inserting, so typing can continue right after the emoji.
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextPos, nextPos);
    });
  }

  function handlePickImage(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(dict.chat.unsupportedImageType);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(dict.chat.imageTooLarge);
      return;
    }
    setSelectedImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelSelectedImage() {
    if (selectedImage) URL.revokeObjectURL(selectedImage.previewUrl);
    setSelectedImage(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;

    if (selectedImage) {
      setSending(true);
      try {
        const formData = new FormData();
        formData.set("file", selectedImage.file);
        const res = await sendImageMessage(conversationId, formData, draft);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
        cancelSelectedImage();
        setDraft("");
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      } finally {
        setSending(false);
      }
      return;
    }

    const content = draft.trim();
    if (!content) return;

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

  const canSend = (!!draft.trim() || !!selectedImage) && !sending;

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
            const isImage = m.attachmentType === "image";
            return (
              <div key={m.id} className={cn("flex flex-col max-w-[75%]", isMine ? "self-end items-end" : "self-start items-start")}>
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl text-sm text-balance break-words",
                    isImage ? "p-1" : "px-3.5 py-2",
                    isMine
                      ? cn("bg-primary text-primary-foreground rounded-br-md", isImage && "p-1")
                      : cn("bg-muted text-foreground rounded-bl-md", isImage && "p-1")
                  )}
                >
                  {isImage && (
                    <ImageBubbleContent message={m} onOpen={setLightboxUrl} />
                  )}
                  {m.content && (
                    <div className={isImage ? "px-2 pt-1.5 pb-1" : undefined}>{m.content}</div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {formatMessageTime(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border shrink-0">
        {selectedImage && (
          <div className="flex items-center gap-3 px-3 pt-3">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, never uploaded until Send */}
              <img src={selectedImage.previewUrl} alt={dict.chat.imageAlt} className="size-16 rounded-xl object-cover" />
              <button
                type="button"
                onClick={cancelSelectedImage}
                disabled={sending}
                aria-label={dict.chat.removeImage}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow"
              >
                <X className="size-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground flex-1 min-w-0">
              {sending ? dict.chat.uploadingImage : selectedImage.file.name}
            </p>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2 px-3 py-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              handlePickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <EmojiPicker onSelect={insertEmoji} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label={dict.chat.attachImage}
            className="flex items-center justify-center size-9 rounded-full hover:bg-muted text-muted-foreground shrink-0 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
          </button>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setCursorPos(e.target.selectionStart);
            }}
            onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
            placeholder={selectedImage ? dict.chat.captionPlaceholder : dict.chat.composerPlaceholder}
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
          <Button type="submit" size="icon" disabled={!canSend} aria-label={dict.chat.send} className="shrink-0">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>

      <ImageLightbox url={lightboxUrl} open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)} />
    </div>
  );
}
