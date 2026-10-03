import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectionCounts } from "@/lib/admin/queries";

/** Aggregate counts only — never lists individual connection pairs. */
export function ConnectionOverview({ connections }: { connections: ConnectionCounts }) {
  const rows: { label: string; value: number }[] = [
    { label: "Total", value: connections.total },
    { label: "Pending", value: connections.pending },
    { label: "Accepted", value: connections.accepted },
    { label: "Rejected", value: connections.rejected },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
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
