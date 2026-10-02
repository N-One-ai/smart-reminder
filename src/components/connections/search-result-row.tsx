"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { sendConnectionRequest, acceptConnectionRequest } from "@/lib/connections/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { UserSearchResult } from "@/types/connection";

export function SearchResultRow({
  result,
  isSelf,
  onChanged,
}: {
  result: UserSearchResult;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  // Local optimistic status so the row updates immediately without needing
  // the whole search list to re-run — the server result is still the source
  // of truth for every subsequent render (onChanged() refreshes it).
  const [localStatus, setLocalStatus] = useState(result.connectionStatus);
  const [localIsRequester, setLocalIsRequester] = useState(result.isRequester);
  const initial = (result.name || result.username || "?").charAt(0).toUpperCase();

  function handleConnect() {
    startTransition(async () => {
      try {
        const res = await sendConnectionRequest(result.id);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        setLocalStatus(res.data.status);
        setLocalIsRequester(res.data.isRequester);
        onChanged();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  function handleAccept() {
    if (!result.connectionId) return;
    startTransition(async () => {
      try {
        const res = await acceptConnectionRequest(result.connectionId!);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        setLocalStatus("accepted");
        onChanged();
      } catch {
        toast.error(NETWORK_ERROR_MESSAGE);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 min-w-0">
      <Avatar size="default">
        {result.avatar_url && <AvatarImage src={result.avatar_url} alt={result.name} />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm font-semibold truncate">{result.name || "?"}</span>
        {result.username && <span className="text-xs text-muted-foreground truncate">@{result.username}</span>}
      </div>

      <div className="shrink-0">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">{dict.connections.isYou}</span>
        ) : localStatus === "accepted" ? (
          <span className="text-xs text-muted-foreground">{dict.connections.connectionsSection}</span>
        ) : localStatus === "pending" && localIsRequester ? (
          <Button size="sm" variant="outline" disabled className="rounded-full min-h-11 sm:min-h-0">
            {dict.connections.requestSent}
          </Button>
        ) : localStatus === "pending" && !localIsRequester ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground text-right max-w-32">
              {dict.connections.theySentYouRequest}
            </span>
            <Button size="sm" onClick={handleAccept} disabled={isPending} className="rounded-full min-h-11 sm:min-h-0">
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {dict.connections.accept}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={isPending} className="rounded-full min-h-11 sm:min-h-0">
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
            {dict.connections.connect}
          </Button>
        )}
      </div>
    </div>
  );
}
