import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegistrationDay } from "@/lib/admin/queries";

/**
 * Plain CSS bar chart — no charting library added for a single 30-bar
 * view. Heights are percentages of the max day in the series, computed
 * server-side; nothing here needs client-side interactivity.
 */
export function RegistrationChart({ data }: { data: RegistrationDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrations — last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-[3px] h-32">
          {data.map((d) => (
            <div
              key={d.date}
              className="group relative flex-1 flex flex-col items-center justify-end h-full"
            >
              <div
                className="w-full rounded-sm bg-primary min-h-[2px] transition-[height]"
                style={{ height: `${(d.count / max) * 100}%` }}
              />
              <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs ring-1 ring-foreground/10 shadow-md group-hover:block">
                {d.date}: {d.count}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}
