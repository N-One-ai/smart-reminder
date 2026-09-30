import type { DayGroup, ReminderOccurrence } from "@/types/reminder";
import { formatDayLabel } from "@/lib/utils/date";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export function groupByDay(dict: Dictionary, occurrences: ReminderOccurrence[]): DayGroup[] {
  const map = new Map<string, ReminderOccurrence[]>();
  for (const occ of occurrences) {
    const list = map.get(occ.occurrenceDate) ?? [];
    list.push(occ);
    map.set(occ.occurrenceDate, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dateKey, occs]) => ({
      label: formatDayLabel(dict, dateKey),
      dateKey,
      occurrences: occs,
    }));
}
