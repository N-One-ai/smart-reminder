import { CompletedView } from "@/components/dashboard/completed-view";
import { getCompletedReminders } from "@/lib/reminder/queries";

export default async function CompletedPage() {
  const reminders = await getCompletedReminders();

  return <CompletedView reminders={reminders} />;
}
