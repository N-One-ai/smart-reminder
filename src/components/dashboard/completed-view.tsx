"use client";

import { CheckCircle2 } from "lucide-react";
import { ReminderListItem } from "@/components/reminder/reminder-list-item";
import { EmptyState } from "@/components/reminder/empty-state";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { Reminder, ReminderOccurrence } from "@/types/reminder";

export function CompletedView({ reminders }: { reminders: Reminder[] }) {
  const dict = useDictionary();
  const occurrences: ReminderOccurrence[] = reminders.map((reminder) => ({
    reminder,
    occurrenceDate: reminder.date,
    isCompleted: true,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-bold tracking-tight">{dict.dashboard.completedTitle}</h1>

      {occurrences.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={dict.dashboard.emptyCompletedTitle}
          description={dict.dashboard.emptyCompletedDescription}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {occurrences.map((occ) => (
            <ReminderListItem key={occ.reminder.id} occurrence={occ} />
          ))}
        </div>
      )}
    </div>
  );
}
