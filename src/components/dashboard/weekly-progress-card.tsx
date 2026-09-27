import { Zap } from "lucide-react";

const SIZE = 76;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WeeklyProgressCard({
  completedDays,
  totalDays,
}: {
  completedDays: number;
  totalDays: number;
}) {
  const ratio = totalDays > 0 ? completedDays / totalDays : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div className="rounded-3xl bg-primary p-5 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/80">
          <Zap className="size-3.5 fill-current" />
          Duy trì thói quen
        </div>
        <p className="font-heading text-lg font-bold text-primary-foreground leading-snug text-balance">
          Tiến độ tuần này
        </p>
      </div>

      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="color-mix(in oklch, var(--primary-foreground) 25%, transparent)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-lg font-bold text-primary-foreground leading-none">
            {completedDays}
          </span>
          <span className="text-[10px] text-primary-foreground/70 leading-none mt-0.5">
            /{totalDays} ngày
          </span>
        </div>
      </div>
    </div>
  );
}
