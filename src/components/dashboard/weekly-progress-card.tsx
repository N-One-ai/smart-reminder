"use client";

import { useEffect, useState } from "react";
import { Check, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyProgress } from "@/lib/reminder/stats";

/**
 * Deliberately no "you're failing" copy (see prd discussion) — every bracket
 * reads as encouragement, even 0/7. Pure function so the mapping is easy to
 * audit/extend without touching render logic.
 */
function getProgressCopy(
  completedDays: number,
  totalDays: number
): { headline: string; footer: string } {
  const remaining = totalDays - completedDays;

  if (completedDays <= 0) {
    return { headline: "Chưa bắt đầu tuần này", footer: "Bắt đầu ngay hôm nay nhé" };
  }
  if (remaining <= 0) {
    return { headline: "Hoàn thành mục tiêu tuần 🎉", footer: "Bạn đã duy trì trọn vẹn cả tuần" };
  }

  const footer = `Còn ${remaining} ngày để đạt mục tiêu`;
  if (completedDays <= 2) return { headline: "Bạn đã bắt đầu rồi", footer };
  if (completedDays <= 4) return { headline: "Bạn đang duy trì tốt", footer };
  return { headline: "Gần đạt mục tiêu rồi", footer };
}

export function WeeklyProgressCard({
  progress,
  onClick,
}: {
  progress: WeeklyProgress;
  onClick?: () => void;
}) {
  const { completedDays, totalDays, days } = progress;
  const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const isComplete = totalDays > 0 && completedDays >= totalDays;
  const { headline, footer } = getProgressCopy(completedDays, totalDays);

  // Animate the bar from 0 on mount instead of snapping straight to its
  // value — a one-time rAF flip after first paint is enough, no need for a
  // heavier animation library for a single width transition.
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarWidth(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full max-w-full min-w-0 text-left rounded-3xl bg-foreground p-5 flex flex-col gap-4 overflow-hidden box-border transition-[filter,transform] active:scale-[0.99] hover:brightness-110"
    >
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-background/70 min-w-0">
          <Zap className="size-3.5 fill-current text-primary shrink-0" />
          <span className="truncate">Duy trì thói quen</span>
        </div>
        <span className="text-xs font-medium text-background/50 shrink-0">Tuần này</span>
      </div>

      <div className="flex flex-col gap-1 min-w-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="font-heading text-2xl font-bold text-background leading-none min-w-0">
          {completedDays}
          <span className="text-background/50 text-base font-medium">/{totalDays} ngày</span>
        </p>
        <p
          className={cn(
            "text-sm font-medium text-balance min-w-0",
            isComplete ? "text-primary" : "text-background/70"
          )}
        >
          {headline}
        </p>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <div className="h-1.5 flex-1 min-w-0 rounded-full bg-background/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className="text-xs font-medium text-background/50 tabular-nums w-9 text-right shrink-0">
          {percent}%
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 min-w-0">
        {days.map((day, i) => (
          <div
            key={day.dateKey}
            className="flex flex-col items-center gap-1.5 flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className={cn(
                "flex items-center justify-center size-7 rounded-full border transition-colors",
                day.isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : day.isFuture
                    ? "border-background/10"
                    : "border-background/20",
                day.isToday && !day.isCompleted && "ring-2 ring-primary/50"
              )}
            >
              {day.isCompleted && <Check className="size-3.5" strokeWidth={3} />}
            </div>
            <span
              className={cn(
                "text-[10px]",
                day.isToday
                  ? "text-background font-semibold"
                  : day.isFuture
                    ? "text-background/35"
                    : "text-background/55"
              )}
            >
              {day.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-background/60 pt-3 border-t border-background/10 min-w-0">
        <Flame className="size-3.5 text-primary shrink-0" />
        <span className="min-w-0 text-balance">{footer}</span>
      </div>
    </button>
  );
}
