/**
 * Deterministic demo id/date helpers for fixture generation.
 * Ids are UUID-shaped (Spec §18.4) and stable across reloads so cross-module
 * references (dashboard -> profile -> examination) never drift.
 */

/** Build a stable UUID-shaped string from two numeric seeds. */
export function demoUuid(namespace: number, n: number): string {
  const h = (v: number, len: number) =>
    Math.abs(Math.round(v)).toString(16).padStart(len, '0').slice(-len)
  return `${h(namespace, 8)}-${h(n, 4)}-4${h(n, 3)}-a${h(namespace + n, 3)}-${h(namespace * 31 + n * 7919, 12)}`
}

const MS_PER_DAY = 86_400_000

/** ISO date (yyyy-mm-dd) offset from today — keeps due/overdue buckets live. */
export function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10)
}

/** ISO datetime offset from today with a fixed hour, for timelines. */
export function isoDateTime(offsetDays: number, hour = 9, minute = 0): string {
  const d = new Date(Date.now() + offsetDays * MS_PER_DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** Fixed historical ISO date (not relative to today). */
export const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
