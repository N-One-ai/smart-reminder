import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toReminder } from "@/lib/reminder/mapper";
import { expandOccurrences } from "@/lib/reminder/recurrence";
import { isDueForNotification } from "@/lib/reminder/notification";
import { sendPush } from "@/lib/push/server";
import { addDays, toDateKey } from "@/lib/utils/date";
import type { Database } from "@/types/database";

type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];

export const dynamic = "force-dynamic";

/**
 * Runs on a schedule (see vercel.json) to fire Web Push for reminders due
 * "now", across ALL users — the one piece foreground polling (useNotifications)
 * can never do, since that only runs while a tab is open. Cross-user reads
 * require the service-role admin client (RLS would otherwise scope to nobody,
 * since there's no signed-in user in a cron request).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = toDateKey(now);
  // A ±1 day window absorbs any timezone offset between server (UTC) and a
  // reminder's own IANA timezone — isDueForNotification does the precise check.
  const windowStart = addDays(today, -1);
  const windowEnd = addDays(today, 1);

  const { data: reminderRows, error: reminderError } = await admin
    .from("reminders")
    .select("*")
    .eq("status", "pending")
    .or(`repeat_rule.not.is.null,and(date.gte.${windowStart},date.lte.${windowEnd})`);

  if (reminderError) {
    console.error("[push-reminders] fetch reminders failed", reminderError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const reminders = (reminderRows ?? []).map(toReminder);
  const dueOccurrences = reminders.flatMap((reminder) =>
    expandOccurrences(reminder, windowStart, windowEnd).filter((occ) => isDueForNotification(occ, now))
  );

  if (dueOccurrences.length === 0) {
    return NextResponse.json({ sent: 0, expired: 0 });
  }

  const userIds = [...new Set(dueOccurrences.map((occ) => occ.reminder.user_id))];
  const { data: subscriptionRows, error: subError } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (subError) {
    console.error("[push-reminders] fetch subscriptions failed", subError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const sub of subscriptionRows ?? []) {
    const list = subscriptionsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subscriptionsByUser.set(sub.user_id, list);
  }

  let sent = 0;
  let expired = 0;
  const notifiedReminderIds = new Set<string>();

  for (const occ of dueOccurrences) {
    const subs = subscriptionsByUser.get(occ.reminder.user_id) ?? [];
    if (subs.length === 0) continue;

    for (const sub of subs) {
      const result = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        {
          title: "Rymi",
          body: `Đã đến lúc: ${occ.reminder.title}`,
          tag: `${occ.reminder.id}-${occ.occurrenceDate}`,
          url: `/app/reminder/${occ.reminder.id}`,
        }
      );

      if (result.ok) {
        sent++;
      } else if (result.expired) {
        expired++;
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }

    notifiedReminderIds.add(occ.reminder.id);
  }

  if (notifiedReminderIds.size > 0) {
    await admin
      .from("reminders")
      .update({ notified_at: now.toISOString() })
      .in("id", [...notifiedReminderIds]);
  }

  return NextResponse.json({ sent, expired, dueCount: dueOccurrences.length });
}
