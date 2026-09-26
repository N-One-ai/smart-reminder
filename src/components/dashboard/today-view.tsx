import { CalendarCheck, CheckCircle2, ListTodo } from "lucide-react";
import { SmartInput } from "@/components/reminder/smart-input";
import { ReminderListItem } from "@/components/reminder/reminder-list-item";
import { EmptyState } from "@/components/reminder/empty-state";
import { WeeklyProgressCard } from "./weekly-progress-card";
import { StatCard } from "./stat-card";
import { DayGroupHeader } from "./day-group-header";
import { expandAllOccurrences } from "@/lib/reminder/recurrence";
import { computeWeeklyProgress, countPendingToday, countCompletedToday } from "@/lib/reminder/stats";
import { addDays, todayKey, greetingForHour } from "@/lib/utils/date";
import type { Reminder } from "@/types/reminder";

export function TodayView({ reminders, userName }: { reminders: Reminder[]; userName: string }) {
  const today = todayKey();

  const todayOccurrences = expandAllOccurrences(reminders, today, today);
  const upcomingPreview = expandAllOccurrences(
    reminders,
    addDays(today, 1),
    addDays(today, 14)
  ).slice(0, 5);

  const weekly = computeWeeklyProgress(reminders, today);
  const pendingToday = countPendingToday(reminders, today);
  const completedToday = countCompletedToday(reminders, today);
  const firstName = userName.split(" ")[0] || userName;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-muted-foreground">{greetingForHour()} 👋</p>
        <h1 className="text-xl font-bold tracking-tight">{firstName || "bạn"}</h1>
      </div>

      <WeeklyProgressCard completedDays={weekly.completedDays} totalDays={weekly.totalDays} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ListTodo} label="Còn lại" value={pendingToday} unit="việc" />
        <StatCard icon={CheckCircle2} label="Đã xong" value={completedToday} unit="việc" />
      </div>

      <SmartInput />

      <div className="flex flex-col gap-3">
        <DayGroupHeader label="Hôm nay" />
        {todayOccurrences.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Chưa có việc gì hôm nay"
            description="Thử nhập một câu như “Chiều nay nhớ gọi cho mẹ”"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {todayOccurrences.map((occ) => (
              <ReminderListItem key={`${occ.reminder.id}-${occ.occurrenceDate}`} occurrence={occ} />
            ))}
          </div>
        )}
      </div>

      {upcomingPreview.length > 0 && (
        <div className="flex flex-col gap-3">
          <DayGroupHeader label="Sắp tới" />
          <div className="flex flex-col gap-2">
            {upcomingPreview.map((occ) => (
              <ReminderListItem key={`${occ.reminder.id}-${occ.occurrenceDate}`} occurrence={occ} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
