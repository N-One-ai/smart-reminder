import { CalendarCheck } from "lucide-react";
import { SmartInput } from "@/components/reminder/smart-input";
import { ReminderListItem } from "@/components/reminder/reminder-list-item";
import { EmptyState } from "@/components/reminder/empty-state";
import { UserMenu } from "@/components/layout/user-menu";
import { WeeklyProgressCard } from "./weekly-progress-card";
import { DayGroupHeader } from "./day-group-header";
import { expandAllOccurrences } from "@/lib/reminder/recurrence";
import { computeWeeklyProgress, countPendingToday, countCompletedToday } from "@/lib/reminder/stats";
import { addDays, todayKey, greetingForHour } from "@/lib/utils/date";
import type { Reminder } from "@/types/reminder";

export function TodayView({
  reminders,
  userName,
  userEmail,
  userAvatarUrl,
}: {
  reminders: Reminder[];
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
}) {
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

  return (
    <div className="flex flex-col gap-6 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm text-muted-foreground">{greetingForHour()} 👋</p>
          <h1 className="font-heading text-xl font-bold tracking-tight truncate">{userName || "bạn"}</h1>
        </div>
        <UserMenu name={userName || "?"} email={userEmail} avatarUrl={userAvatarUrl} avatarSize="lg" />
      </div>

      <SmartInput />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <DayGroupHeader label="Hôm nay" className="mb-0" />
          {(pendingToday > 0 || completedToday > 0) && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{pendingToday} còn lại</span>
              <span aria-hidden="true">·</span>
              <span>{completedToday} đã xong</span>
            </div>
          )}
        </div>
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

      <WeeklyProgressCard progress={weekly} />
    </div>
  );
}
