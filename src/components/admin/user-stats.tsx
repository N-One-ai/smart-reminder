import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminUserDetail } from "@/lib/admin/user-queries";

/** Aggregate counts only, scoped to this one user — never a reminder
 * title/description, never message/conversation content. */
export function UserStats({ user }: { user: AdminUserDetail }) {
  if (!user.statsAvailable) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">Could not load statistics for this user. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const reminderRows = [
    { label: "Total", value: user.reminders.total },
    { label: "Pending", value: user.reminders.pending },
    { label: "Completed", value: user.reminders.completed },
    { label: "Shared", value: user.reminders.shared },
    { label: "Private", value: user.reminders.private },
  ];

  const connectionRows = [
    { label: "Total", value: user.connections.total },
    { label: "Pending", value: user.connections.pending },
    { label: "Accepted", value: user.connections.accepted },
    { label: "Rejected", value: user.connections.rejected },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {reminderRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            {connectionRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
