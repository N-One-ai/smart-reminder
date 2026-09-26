export function DayGroupHeader({ label }: { label: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
      {label}
    </h2>
  );
}
