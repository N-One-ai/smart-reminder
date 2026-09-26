import { TodayView } from "@/components/dashboard/today-view";
import { getRemindersForWindow, getCurrentUser } from "@/lib/reminder/queries";
import { addDays, todayKey } from "@/lib/utils/date";

export default async function TodayPage() {
  const today = todayKey();
  // Window starts 6 days back so the dashboard's weekly progress ring can see
  // the last 7 days (today included), not just today-forward.
  const [reminders, user] = await Promise.all([
    getRemindersForWindow(addDays(today, -6), addDays(today, 14)),
    getCurrentUser(),
  ]);

  return <TodayView reminders={reminders} userName={user?.name || user?.email || ""} />;
}
