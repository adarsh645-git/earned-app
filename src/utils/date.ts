/**
 * Local-calendar-day helpers. `Date.prototype.toISOString()` is UTC, which
 * drifts a day off the device's actual local date for part of the evening
 * in any negative-UTC-offset timezone (e.g. after 7pm EST, UTC has already
 * rolled to tomorrow) — using it to key "today"/"yesterday" is the bug this
 * file exists to prevent. Everything here reads the local calendar date via
 * getFullYear/getMonth/getDate, never toISOString().
 */

/** "YYYY-MM-DD" for the device's local calendar day — the one true way to
 * key "what day is this" anywhere in the app. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a "YYYY-MM-DD" dateKey back into a Date anchored at LOCAL
 * midnight — plain `new Date(dateKey)` parses date-only strings as UTC
 * midnight, which shifts a day when formatted back through toLocaleDateString. */
export function parseLocalDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

/** Local dateKey for "yesterday" relative to `from` — calendar-aware via
 * setDate (DST-safe), not a raw 24h millisecond subtraction. */
export function yesterdayDateKey(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}

/** Local dateKey for a stored `dateCreated` timestamp. Most rows are a full
 * ISO instant (e.g. task/waypoint/item dateCreated) and get converted
 * through the local calendar; a handful of legacy task rows predate the
 * full-timestamp migration and are already a bare "YYYY-MM-DD" with no
 * time/zone info — those pass through unchanged rather than being
 * reinterpreted as UTC midnight (which would shift them a day). */
export function localDayKeyFromTimestamp(timestamp: string): string {
  if (!timestamp.includes('T')) return timestamp;
  return localDateKey(new Date(timestamp));
}
