"use client";

import { useEffect, useState } from "react";
import { Check, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyProgress } from "@/lib/reminder/stats";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

/**
 * Deliberately no "you're failing" copy (see prd discussion) — every bracket
 * reads as encouragement, even 0/7. Pure function so the mapping is easy to
 * audit/extend without touching render logic.
 */
function getProgressCopy(
  dict: Dictionary,
  completedDays: number,
  totalDays: number
): { headline: string; footer: string } {
  const remaining = totalDays - completedDays;
  const t = dict.weeklyProgress;

  if (completedDays <= 0) {
    return { headline: t.notStarted, footer: t.startToday };
  }
  if (remaining <= 0) {
    return { headline: t.goalComplete, footer: t.fullWeekDone };
  }

  const footer = t.daysToGoal(remaining);
  if (completedDays <= 2) return { headline: t.justStarted, footer };
  if (completedDays <= 4) return { headline: t.goingWell, footer };
  return { headline: t.almostThere, footer };
}

export function WeeklyProgressCard({
  progress,
  onClick,
}: {
  progress: WeeklyProgress;
  onClick?: () => void;
}) {
  const dict = useDictionary();
  const { completedDays, totalDays, days } = progress;
  const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const isComplete = totalDays > 0 && completedDays >= totalDays;
  const { headline, footer } = getProgressCopy(dict, completedDays, totalDays);

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
      className="relative w-full max-w-full min-w-0 text-left rounded-3xl p-5 overflow-hidden box-border border border-white/8 bg-gradient-to-b from-[#111214] to-[#0B0B0D] shadow-[0_14px_32px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] transition-[filter,transform] active:scale-[0.99] hover:brightness-110"
    >
      {/* Technical grid — purely decorative, kept to ~3% opacity so it reads
          as texture, never competes with text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Radial lime glow seated behind the progress bar — low opacity, never
          tints the card itself. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-[62%] z-0 h-28 -translate-y-1/2 opacity-[0.1] blur-2xl"
        style={{ background: "radial-gradient(ellipse at center, var(--primary), transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/70 min-w-0">
            <Zap
              className="size-3.5 fill-current text-primary shrink-0"
              style={{ filter: "drop-shadow(0 0 3px var(--primary))" }}
            />
            <span className="truncate">{dict.weeklyProgress.maintainHabit}</span>
          </div>
          <span className="text-xs font-medium text-white/40 shrink-0">{dict.weeklyProgress.thisWeek}</span>
        </div>

        <div className="flex flex-col gap-1 min-w-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <p className="font-heading text-2xl font-bold leading-none min-w-0">
            <span
              className="text-white"
              style={{ textShadow: "0 0 14px rgba(224, 246, 101, 0.22)" }}
            >
              {completedDays}
            </span>
            <span className="text-white/40 text-base font-medium">/{totalDays} {dict.weeklyProgress.daysUnit}</span>
          </p>
          <p
            className={cn(
              "text-sm font-medium text-balance min-w-0",
              isComplete ? "text-primary" : "text-white/70"
            )}
          >
            {headline}
          </p>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-white/8 ring-1 ring-inset ring-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-700 ease-out"
                style={{
                  width: `${barWidth}%`,
                  boxShadow: barWidth > 0 ? "0 0 8px 1px rgba(224, 246, 101, 0.4)" : undefined,
                }}
              />
            </div>
            {barWidth > 0 && barWidth < 100 && (
              <span
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-1.5 rounded-full bg-primary"
                style={{ left: `${barWidth}%`, boxShadow: "0 0 6px 1px rgba(224, 246, 101, 0.7)" }}
              >
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-white/50 tabular-nums w-9 text-right shrink-0">
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
              <Check
                className={cn(
                  "size-5 shrink-0 transition-colors",
                  day.isCompleted
                    ? "text-primary"
                    : day.isToday
                      ? "text-white/55 animate-pulse"
                      : "text-white/15"
                )}
                strokeWidth={2.75}
                style={
                  day.isCompleted
                    ? { filter: `drop-shadow(0 0 ${day.isToday ? 4 : 2}px var(--primary))` }
                    : day.isToday
                      ? { filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))" }
                      : undefined
                }
              />
              <span
                className={cn(
                  "text-[10px]",
                  day.isToday
                    ? "text-white font-semibold"
                    : day.isCompleted
                      ? "text-white/60"
                      : "text-white/30"
                )}
              >
                {day.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/60 pt-3 border-t border-white/8 min-w-0">
          <Flame
            className="size-3.5 text-primary shrink-0"
            style={{ filter: "drop-shadow(0 0 3px var(--primary))" }}
          />
          <span className="min-w-0 text-balance">{footer}</span>
        </div>
      </div>
    </button>
  );
}
