import { CheckCircle2 } from "lucide-react";
import { ReminderListItem } from "@/components/reminder/reminder-list-item";
import { EmptyState } from "@/components/reminder/empty-state";
import type { Reminder, ReminderOccurrence } from "@/types/reminder";

export function CompletedView({ reminders }: { reminders: Reminder[] }) {
  const occurrences: ReminderOccurrence[] = reminders.map((reminder) => ({
    reminder,
    occurrenceDate: reminder.date,
    isCompleted: true,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-bold tracking-tight">Đã hoàn thành</h1>

      {occurrences.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Chưa có gì hoàn thành"
          description="Các lời nhắc bạn đã hoàn thành sẽ xuất hiện ở đây."
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
