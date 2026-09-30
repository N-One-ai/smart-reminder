import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReminderDetailClient } from "@/components/reminder/reminder-detail-client";
import { getReminderById } from "@/lib/reminder/queries";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ReminderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [reminder, locale] = await Promise.all([getReminderById(id), getLocale()]);
  const dict = getDictionary(locale);

  if (!reminder) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{dict.reminderDetail.notFound}</p>
        <Button asChild variant="outline">
          <Link href="/app">{dict.reminderDetail.backHome}</Link>
        </Button>
      </div>
    );
  }

  return <ReminderDetailClient reminder={reminder} />;
}
