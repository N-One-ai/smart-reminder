"use client";

import { Loader2 } from "lucide-react";
import type { PublicProfile } from "@/types/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDictionary } from "@/lib/i18n/locale-provider";

/**
 * Purely presentational "@mention" dropdown for SmartInput — the actual
 * trigger detection, filtering, and text-insertion logic lives in
 * SmartInput itself, since that's where the textarea's cursor/value state
 * already is. Deliberately NOT a Dialog (unlike the "Chia sẻ với" picker in
 * ReminderEditForm): a modal would steal focus from the textarea the user
 * is actively typing in, whereas this has to stay anchored under it while
 * typing continues to filter the list.
 */
export function MentionPicker({
  items,
  loading,
  activeIndex,
  onSelect,
}: {
  items: PublicProfile[];
  loading: boolean;
  activeIndex: number;
  onSelect: (person: PublicProfile) => void;
}) {
  const dict = useDictionary();

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border bg-popover shadow-lg overflow-hidden">
      <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/50">
        🔍 {dict.smartInput.mentionSearchPlaceholder}
      </div>
      <div className="flex flex-col max-h-56 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : items.length > 0 ? (
          items.map((person, index) => (
            <button
              key={person.id}
              type="button"
              onMouseDown={(e) => {
                // Prevent the textarea from blurring before onSelect runs —
                // a plain onClick would fire after blur already closed this
                // popup via the textarea's onBlur handler.
                e.preventDefault();
                onSelect(person);
              }}
              className={`flex items-center gap-3 px-3 py-2 text-left hover:bg-muted ${
                index === activeIndex ? "bg-muted" : ""
              }`}
            >
              <Avatar size="sm">
                {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.name} />}
                <AvatarFallback>{(person.name || person.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-semibold truncate">{person.name || "?"}</span>
                {person.username && (
                  <span className="text-xs text-muted-foreground truncate">@{person.username}</span>
                )}
              </div>
            </button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6 px-3">
            {dict.reminderForm.noConnectionsToShare}
          </p>
        )}
      </div>
    </div>
  );
}
