import type { Dictionary } from "@/lib/i18n/get-dictionary";

/** "YYYY-MM-DD" for today, in local browser time. Prototype only — real app resolves per-user timezone server-side. */
export function todayKey(): string {
  return toDateKey(new Date());
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDateKey(dt);
}

export function daysBetween(fromKey: string, toKeyStr: string): number {
  const [y1, m1, d1] = fromKey.split("-").map(Number);
  const [y2, m2, d2] = toKeyStr.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

/** Locale-aware human label for a date relative to today: "Hôm nay" / "Ngày mai" / "Thứ 7" / "28/09". */
export function formatDayLabel(dict: Dictionary, dateKey: string, todayRef: string = todayKey()): string {
  const diff = daysBetween(todayRef, dateKey);
  if (diff === 0) return dict.dateLabels.today;
  if (diff === 1) return dict.dateLabels.tomorrow;
  if (diff === 2) return dict.dateLabels.dayAfterTomorrow;

  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);

  if (diff > 2 && diff <= 7) {
    return dict.weekdaysFullByGetDay[dt.getDay()];
  }

  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/** "08:00" — already stored as HH:MM, just pass through / validate. */
export function formatTime(time: string): string {
  return time;
}

export function formatFullDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Locale-aware time-of-day greeting. */
export function greetingForHour(dict: Dictionary, hour: number = new Date().getHours()): string {
  if (hour < 11) return dict.greeting.morning;
  if (hour < 14) return dict.greeting.noon;
  if (hour < 18) return dict.greeting.afternoon;
  return dict.greeting.evening;
}

const WEEKDAY_EN = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Builds the runtime context the AI parser needs to resolve relative dates
 * ("mai", "2 tiếng nữa"). Must be called client-side — the server's clock/tz
 * may not match the user's, and the AI must never receive a hardcoded date.
 * See prd-smart-reminder.md §D.
 */
export function buildAIContext() {
  const now = new Date();
  return {
    currentDate: toDateKey(now),
    currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayOfWeek: WEEKDAY_EN[now.getDay()],
  };
}
