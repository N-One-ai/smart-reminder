"use client";

import { CalendarClock } from "lucide-react";
import { ReminderListItem } from "@/components/reminder/reminder-list-item";
import { EmptyState } from "@/components/reminder/empty-state";
import { DayGroupHeader } from "./day-group-header";
import { expandAllOccurrences } from "@/lib/reminder/recurrence";
import { groupByDay } from "@/lib/reminder/grouping";
import { todayKey } from "@/lib/utils/date";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { Reminder } from "@/types/reminder";

export function UpcomingView({
  reminders,
  windowEnd,
}: {
  reminders: Reminder[];
  windowEnd: string;
}) {
  const dict = useDictionary();
  const today = todayKey();
  const occurrences = expandAllOccurrences(reminders, today, windowEnd);
  const groups = groupByDay(dict, occurrences);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-bold tracking-tight">{dict.dashboard.upcomingTitle}</h1>

      {groups.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={dict.dashboard.emptyUpcomingTitle}
          description={dict.dashboard.emptyUpcomingDescription}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.dateKey} className="flex flex-col gap-3">
              <DayGroupHeader label={group.label} />
              <div className="flex flex-col gap-2">
                {group.occurrences.map((occ) => (
                  <ReminderListItem
                    key={`${occ.reminder.id}-${occ.occurrenceDate}`}
                    occurrence={occ}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
