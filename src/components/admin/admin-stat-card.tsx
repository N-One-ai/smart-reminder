import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Small muted line under the value — e.g. "+3 today". Optional. */
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </span>
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
