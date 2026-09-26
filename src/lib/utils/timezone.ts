/**
 * Converts a civil date+time ("YYYY-MM-DD", "HH:MM") in a given IANA timezone
 * into the actual UTC instant it represents. No date library needed — uses
 * the standard "render the same instant in two zones, diff the wall-clock
 * strings" trick, which works because both renders go through the same
 * (browser-local) Date parser, so that parser's own bias cancels out in the
 * subtraction and only the real UTC offset of `timeZone` remains.
 *
 * Required because reminders store civil time + an explicit timezone (see
 * prd-smart-reminder.md §C) — never assume the viewer's browser tz matches
 * the reminder's stored tz.
 */
export function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const guessUtc = new Date(`${dateKey}T${time}:00Z`);
  const offsetMs = getTimezoneOffsetMs(timeZone, guessUtc);
  return new Date(guessUtc.getTime() - offsetMs);
}

/** How far ahead of UTC `timeZone` is at `instant`, in milliseconds. */
function getTimezoneOffsetMs(timeZone: string, instant: Date): number {
  const tzWallClock = new Date(instant.toLocaleString("en-US", { timeZone }));
  const utcWallClock = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return tzWallClock.getTime() - utcWallClock.getTime();
}
