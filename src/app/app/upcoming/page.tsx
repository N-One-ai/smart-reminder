import { UpcomingView } from "@/components/dashboard/upcoming-view";
import { getRemindersForWindow } from "@/lib/reminder/queries";
import { addDays, todayKey } from "@/lib/utils/date";

export default async function UpcomingPage() {
  const today = todayKey();
  const windowEnd = addDays(today, 90);
  const reminders = await getRemindersForWindow(today, windowEnd);

  return <UpcomingView reminders={reminders} windowEnd={windowEnd} />;
}
