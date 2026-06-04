/**
 * Asia/Ho_Chi_Minh (UTC+7, no DST) day/month bucketing for analytics.
 *
 * A "day" runs 00:00 → 24:00 VN local time: 00:00 starts a new day, 24:00 ends
 * it. Use these helpers so daily order/revenue stats line up with the calendar
 * day a Vietnamese admin sees on the wall — NOT the UTC day (which rolls over at
 * 07:00 VN) nor the server's local day.
 *
 * Mirrors the VN-offset convention already used in `src/lib/sale-kpi.ts`.
 */

export const VN_OFFSET_HOURS = 7;
const VN_OFFSET_MS = VN_OFFSET_HOURS * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

function toMs(instant: string | number | Date): number {
  if (instant instanceof Date) return instant.getTime();
  if (typeof instant === "number") return instant;
  return new Date(instant).getTime();
}

/** Date part ("YYYY-MM-DD") of a "YYYY-MM-DD" or full-ISO string. */
function dayPart(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** "YYYY-MM-DD" of the VN-local day containing `instant`. */
export function vnDayKey(instant: string | number | Date): string {
  const vn = new Date(toMs(instant) + VN_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const mo = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/** "YYYY-MM" of the VN-local month containing `instant`. */
export function vnMonthKey(instant: string | number | Date): string {
  return vnDayKey(instant).slice(0, 7);
}

/** UTC instant marking the START (inclusive) of VN day `dayStr` — VN midnight. */
export function vnDayStartUtc(dayStr: string): Date {
  // `dayStr` 00:00 VN === (`dayStr` 00:00 UTC) − 7h
  return new Date(new Date(`${dayPart(dayStr)}T00:00:00.000Z`).getTime() - VN_OFFSET_MS);
}

/** UTC instant marking the END (exclusive) of VN day `dayStr` — the next VN midnight (24:00). */
export function vnDayEndUtcExclusive(dayStr: string): Date {
  return new Date(vnDayStartUtc(dayStr).getTime() + DAY_MS);
}

/**
 * Convert an inclusive VN calendar-day range [fromDay, toDay] (each "YYYY-MM-DD"
 * or full ISO — only the date part is used) into a half-open UTC instant range
 * for `.gte(startUtc).lt(endUtc)` timestamptz queries. `toDay` is fully included
 * up to its 24:00 (= next VN midnight).
 */
export function vnRangeToUtc(
  fromDay: string,
  toDay: string,
): { startUtc: string; endUtc: string } {
  return {
    startUtc: vnDayStartUtc(fromDay).toISOString(),
    endUtc: vnDayEndUtcExclusive(toDay).toISOString(),
  };
}

/** Inclusive list of VN day keys ("YYYY-MM-DD") from `fromDay`..`toDay` — for zero-filling charts. */
export function vnDayKeysInRange(fromDay: string, toDay: string): string[] {
  const keys: string[] = [];
  const endMs = vnDayStartUtc(toDay).getTime();
  let ms = vnDayStartUtc(fromDay).getTime();
  for (let guard = 0; ms <= endMs && guard < 4000; ms += DAY_MS, guard++) {
    keys.push(vnDayKey(ms));
  }
  return keys;
}

/** Inclusive list of VN month keys ("YYYY-MM") spanning `fromDay`..`toDay`. */
export function vnMonthKeysInRange(fromDay: string, toDay: string): string[] {
  const f = dayPart(fromDay);
  const t = dayPart(toDay);
  let y = Number(f.slice(0, 4));
  let m = Number(f.slice(5, 7));
  const ty = Number(t.slice(0, 4));
  const tm = Number(t.slice(5, 7));
  const keys: string[] = [];
  for (let guard = 0; (y < ty || (y === ty && m <= tm)) && guard < 600; guard++) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return keys;
}
