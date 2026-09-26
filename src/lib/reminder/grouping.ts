import type { DayGroup, ReminderOccurrence } from "@/types/reminder";
import { formatDayLabel } from "@/lib/utils/date";

export function groupByDay(occurrences: ReminderOccurrence[]): DayGroup[] {
  const map = new Map<string, ReminderOccurrence[]>();
  for (const occ of occurrences) {
    const list = map.get(occ.occurrenceDate) ?? [];
    list.push(occ);
    map.set(occ.occurrenceDate, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dateKey, occs]) => ({
      label: formatDayLabel(dateKey),
      dateKey,
      occurrences: occs,
    }));
}
