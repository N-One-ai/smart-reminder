"use client";

import { Bell, Calendar, Clock, Link2, Loader2, Repeat } from "lucide-react";
import type { AIParseResult } from "@/types/ai";
import type { PublicProfile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { formatDayLabel } from "@/lib/utils/date";
import { useDictionary } from "@/lib/i18n/locale-provider";

export function ReminderPreviewCard({
  result,
  saving = false,
  onConfirm,
  onEdit,
  sharedWithUser,
}: {
  result: AIParseResult;
  saving?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  /** Set when the user @mentioned a Connection in the composer before
   * parsing — resolved to a real profile UUID at selection time, never from
   * AI output (see SmartInput's mention handling). */
  sharedWithUser?: PublicProfile | null;
}) {
  const dict = useDictionary();
  if (!result.date || !result.time || !result.title) return null;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
          <Bell className="size-4" />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-semibold">{result.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatDayLabel(dict, result.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {result.time}
            </span>
            {result.recurrence && (
              <span className="flex items-center gap-1">
                <Repeat className="size-3.5" />
                {dict.recurrence[result.recurrence.frequency]}
              </span>
            )}
          </div>
        </div>
      </div>

      {sharedWithUser && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="size-3.5" />
          {dict.reminderDetail.sharedWith(sharedWithUser.name || "?")}
        </span>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onConfirm} disabled={saving} className="flex-1">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {dict.reminderCard.confirm}
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit} disabled={saving} className="flex-1">
          {dict.reminderCard.edit}
        </Button>
      </div>
    </div>
  );
}
