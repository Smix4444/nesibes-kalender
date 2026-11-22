import { atLocalTime, fromMinutes, toMinutes, weekdayIndex } from "@/lib/dates";
import { SLOT_STEP_MINUTES } from "@/lib/config";

export type Interval = { start: number; end: number };
export type BusySlot = { starts_at: string; ends_at: string };
export type AvailabilityRule = { weekday: number; start_time: string; end_time: string };

/** Voegt overlappende of aansluitende intervallen samen. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start <= last.end) last.end = Math.max(last.end, current.end);
    else merged.push({ ...current });
  }
  return merged;
}

/** Trekt de bezette stukken van de vrije vensters af. */
export function subtractIntervals(free: Interval[], busy: Interval[]): Interval[] {
  const merged = mergeIntervals(busy);
  let result = [...free];

  for (const block of merged) {
    const next: Interval[] = [];
    for (const window of result) {
      if (block.end <= window.start || block.start >= window.end) {
        next.push(window);
        continue;
      }
      if (block.start > window.start) next.push({ start: window.start, end: block.start });
      if (block.end < window.end) next.push({ start: block.end, end: window.end });
    }
    result = next;
  }
  return result.filter((i) => i.end > i.start);
}

/**
 * Bezette tijdvakken omzetten naar minuten binnen één lokale dag. Een afspraak
 * die over middernacht loopt wordt op de dagrand afgekapt. Omdat we met echte
 * tijdstippen rekenen klopt dit ook op de dag dat de klok verzet wordt.
 */
export function busyToMinutes(dayIso: string, busy: BusySlot[]): Interval[] {
  const dayStart = atLocalTime(dayIso, "00:00").getTime();

  return busy
    .map((slot) => ({
      start: Math.max(0, (new Date(slot.starts_at).getTime() - dayStart) / 60000),
      end: Math.min(1440, (new Date(slot.ends_at).getTime() - dayStart) / 60000),
    }))
    .filter((i) => i.end > i.start);
}

/** De vrije vensters van een dag: wekelijkse regels min wat al bezet is. */
export function freeWindows(
  dayIso: string,
  rules: AvailabilityRule[],
  busy: BusySlot[],
): Interval[] {
  const weekday = weekdayIndex(dayIso);
  const windows = rules
    .filter((r) => r.weekday === weekday)
    .map((r) => ({ start: toMinutes(r.start_time), end: toMinutes(r.end_time) }));

  return subtractIntervals(mergeIntervals(windows), busyToMinutes(dayIso, busy));
}

/**
 * Starttijden (per kwartier) waarop een afspraak van `duration` minuten
 * helemaal binnen een vrij venster past.
 */
export function startOptions(
  windows: Interval[],
  duration: number,
  step = SLOT_STEP_MINUTES,
): string[] {
  const options: string[] = [];

  for (const window of windows) {
    const first = Math.ceil(window.start / step) * step;
    for (let t = first; t + duration <= window.end; t += step) {
      options.push(fromMinutes(t));
    }
  }
  return options;
}

/** Totale duur van een reeks intervallen, in minuten. */
export const totalMinutes = (intervals: Interval[]): number =>
  intervals.reduce((sum, i) => sum + (i.end - i.start), 0);

/** Hoeveel van de vrije uren nog over is (0-1) — voor het dagbalkje. */
export function freeRatio(dayIso: string, rules: AvailabilityRule[], busy: BusySlot[]): number {
  const weekday = weekdayIndex(dayIso);
  const total = totalMinutes(
    mergeIntervals(
      rules
        .filter((r) => r.weekday === weekday)
        .map((r) => ({ start: toMinutes(r.start_time), end: toMinutes(r.end_time) })),
    ),
  );
  if (total === 0) return 0;
  return totalMinutes(freeWindows(dayIso, rules, busy)) / total;
}
