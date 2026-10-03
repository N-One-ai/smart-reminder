import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReminderCounts } from "@/lib/admin/queries";

/** Aggregate-only — never shows a title/description, per the Admin Portal
 * privacy requirement (bulk reminder content is out of scope for v1). */
export function ReminderOverview({ reminders }: { reminders: ReminderCounts }) {
  const rows: { label: string; value: number }[] = [
    { label: "Total reminders", value: reminders.total },
    { label: "Pending", value: reminders.pending },
    { label: "Completed", value: reminders.completed },
    { label: "Shared", value: reminders.shared },
    { label: "Private", value: reminders.private },
    { label: "AI-created", value: reminders.aiCreated },
    { label: "Manual-created", value: reminders.manualCreated },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
