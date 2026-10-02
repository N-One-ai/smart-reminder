"use client";

import { useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { acceptConnectionRequest, rejectConnectionRequest } from "@/lib/connections/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { ConnectionWithProfile } from "@/types/connection";

export function IncomingRequestRow({
  connection,
  onChanged,
}: {
  connection: ConnectionWithProfile;
  onChanged: () => void;
}) {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const { otherUser } = connection;
  const initial = (otherUser.name || otherUser.username || "?").charAt(0).toUpperCase();

  function handleAccept() {
    startTransition(async () => {
      try {
        const res = await acceptConnectionRequest(connection.id);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        onChanged();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        const res = await rejectConnectionRequest(connection.id);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        onChanged();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border p-3 min-w-0">
      <Avatar size="default">
        {otherUser.avatar_url && <AvatarImage src={otherUser.avatar_url} alt={otherUser.name} />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm font-semibold truncate">{otherUser.name || "?"}</span>
        {otherUser.username && <span className="text-xs text-muted-foreground truncate">@{otherUser.username}</span>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="icon-sm"
          onClick={handleAccept}
          disabled={isPending}
          aria-label={dict.connections.accept}
          className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={handleReject}
          disabled={isPending}
          aria-label={dict.connections.reject}
          className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
