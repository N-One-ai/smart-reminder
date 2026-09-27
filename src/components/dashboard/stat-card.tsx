import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  unit: string;
}) {
  return (
    <div className="rounded-3xl bg-card border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
          <Icon className="size-3.5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="font-heading text-2xl font-bold tracking-tight">
        {value}
        <span className="font-sans text-sm font-medium text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  );
}
