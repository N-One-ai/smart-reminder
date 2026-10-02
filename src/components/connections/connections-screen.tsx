"use client";

import { useRouter } from "next/navigation";
import { Users, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/reminder/empty-state";
import { SearchBar } from "./search-bar";
import { IncomingRequestRow } from "./incoming-request-row";
import { ConnectionRow } from "./connection-row";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { ConnectionWithProfile } from "@/types/connection";

export function ConnectionsScreen({
  currentUserId,
  incomingRequests,
  connections,
  unreadByUserId,
}: {
  currentUserId: string;
  incomingRequests: ConnectionWithProfile[];
  connections: ConnectionWithProfile[];
  unreadByUserId: Record<string, number>;
}) {
  const dict = useDictionary();
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-bold tracking-tight">{dict.connections.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.connections.subtitle}</p>
      </div>

      <SearchBar currentUserId={currentUserId} onChanged={refresh} />

      {incomingRequests.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            {dict.connections.pendingSection}
          </h2>
          <div className="flex flex-col gap-2">
            {incomingRequests.map((req) => (
              <IncomingRequestRow key={req.id} connection={req} onChanged={refresh} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {connections.length > 0 && (
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            {dict.connections.connectionsSection}
          </h2>
        )}
        {connections.length === 0 ? (
          <EmptyState
            icon={Users}
            title={dict.connections.emptyTitle}
            description={dict.connections.emptyDescription}
            action={
              <Button
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => document.getElementById("connections-search-input")?.focus()}
              >
                <UserRoundPlus className="size-3.5" />
                {dict.connections.emptyCta}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {connections.map((conn) => (
              <ConnectionRow
                key={conn.id}
                connection={conn}
                unreadCount={unreadByUserId[conn.otherUser.id] ?? 0}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
