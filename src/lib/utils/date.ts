const WEEKDAY_VI = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

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

/** Vietnamese human label for a date relative to today: "Hôm nay" / "Ngày mai" / "Thứ 7" / "28/09". */
export function formatDayLabel(dateKey: string, todayRef: string = todayKey()): string {
  const diff = daysBetween(todayRef, dateKey);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === 2) return "Ngày kia";

  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);

  if (diff > 2 && diff <= 7) {
    return WEEKDAY_VI[dt.getDay()];
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

/** Time-of-day greeting — "Chào buổi sáng/chiều/tối". Falls back client-safe. */
export function greetingForHour(hour: number = new Date().getHours()): string {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
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
