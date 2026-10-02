"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, User, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { removeConnection } from "@/lib/connections/actions";
import { getOrCreateConversation } from "@/lib/chat/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { ConnectionWithProfile } from "@/types/connection";

export function ConnectionRow({
  connection,
  unreadCount = 0,
  onChanged,
}: {
  connection: ConnectionWithProfile;
  unreadCount?: number;
  onChanged: () => void;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [chatPending, setChatPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { otherUser } = connection;
  const initial = (otherUser.name || otherUser.username || "?").charAt(0).toUpperCase();

  function handleRemove() {
    startTransition(async () => {
      try {
        const res = await removeConnection(connection.id);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        setConfirmOpen(false);
        onChanged();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  async function handleChat() {
    setChatPending(true);
    try {
      const res = await getOrCreateConversation(otherUser.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      router.push(`/app/chat/${res.data.conversationId}`);
    } catch {
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setChatPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-border p-3 min-w-0">
        <div className="relative shrink-0">
          <Avatar size="default">
            {otherUser.avatar_url && <AvatarImage src={otherUser.avatar_url} alt={otherUser.name} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-[9px] font-semibold text-white ring-2 ring-card">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-sm font-semibold truncate">{otherUser.name || "?"}</span>
          {otherUser.username && <span className="text-xs text-muted-foreground truncate">@{otherUser.username}</span>}
        </div>

        <button
          type="button"
          onClick={handleChat}
          disabled={chatPending}
          aria-label={dict.connections.chat}
          className="flex items-center justify-center size-9 rounded-full hover:bg-muted shrink-0 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
        >
          {chatPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <MessageCircle className="size-4 text-foreground" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-full hover:bg-muted shrink-0 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 flex items-center justify-center"
              aria-label={dict.common.options}
            >
              <MoreVertical className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="size-4" />
              {dict.connections.viewProfile}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" />
              {dict.connections.removeConnection}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader className="items-center text-center gap-3">
            <Avatar size="xl">
              {otherUser.avatar_url && <AvatarImage src={otherUser.avatar_url} alt={otherUser.name} />}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <DialogTitle>{otherUser.name || "?"}</DialogTitle>
            {otherUser.username && (
              <DialogDescription>@{otherUser.username}</DialogDescription>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.connections.removeConfirmTitle(otherUser.name || "?")}</AlertDialogTitle>
            <AlertDialogDescription>{dict.connections.removeConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={isPending}>
              {dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
