import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReminderDetailClient } from "@/components/reminder/reminder-detail-client";
import { getReminderById } from "@/lib/reminder/queries";

export default async function ReminderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reminder = await getReminderById(id);

  if (!reminder) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Không tìm thấy lời nhắc này.</p>
        <Button asChild variant="outline">
          <Link href="/app">Về trang chính</Link>
        </Button>
      </div>
    );
  }

  return <ReminderDetailClient reminder={reminder} />;
}
