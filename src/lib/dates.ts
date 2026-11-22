import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { nl } from "date-fns/locale";
import { TZ } from "@/lib/config";

/** Een datum/tijd omzetten naar de wandklok in Brussel. */
export function toLocal(date: Date | string): Date {
  return toZonedTime(typeof date === "string" ? new Date(date) : date, TZ);
}

/** Een lokale wandklok-tijd terug naar een echt tijdstip. */
export function fromLocal(date: Date): Date {
  return fromZonedTime(date, TZ);
}

/** Formatteert in Brusselse tijd, Nederlandse namen, 24u-notatie. */
export function fmt(date: Date | string, pattern: string): string {
  return formatInTimeZone(typeof date === "string" ? new Date(date) : date, TZ, pattern, {
    locale: nl,
  });
}

export const fmtTime = (d: Date | string) => fmt(d, "HH:mm");
export const fmtDay = (d: Date | string) => fmt(d, "EEEE d MMMM");
export const fmtShortDay = (d: Date | string) => fmt(d, "EEE d/MM");
export const fmtDateTime = (d: Date | string) => fmt(d, "EEE d/MM HH:mm");
export const fmtLongDateTime = (d: Date | string) => fmt(d, "EEEE d MMMM 'om' HH:mm");

/** "2026-11-22" in Brusselse tijd — de sleutel voor dag-vergelijkingen. */
export const dayKey = (d: Date | string) => fmt(d, "yyyy-MM-dd");

/** Bereik van een lokale dag, als echte tijdstippen. */
export function dayRange(dayIso: string): { from: Date; to: Date } {
  const from = atLocalTime(dayIso, "00:00");
  const to = new Date(from);
  // Via de lokale dag rekenen, zodat zomer-/wintertijd klopt.
  const [y, m, d] = dayIso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextIso = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  to.setTime(atLocalTime(nextIso, "00:00").getTime());
  return { from, to };
}

/** Maakt een tijdstip uit een lokale dag + "HH:mm". */
export function atLocalTime(dayIso: string, time: string): Date {
  return fromZonedTime(`${dayIso}T${time.length === 5 ? time : time.slice(0, 5)}:00`, TZ);
}

/** Minuten sinds middernacht uit "HH:mm" of "HH:mm:ss". */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minuten sinds middernacht terug naar "HH:mm". */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Weekdag volgens onze conventie: 0 = maandag ... 6 = zondag. */
export function weekdayIndex(dayIso: string): number {
  const [y, m, d] = dayIso.split("-").map(Number);
  // Date.UTC vermijdt dat de zone van de server meespeelt.
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Lijst lokale dag-sleutels vanaf (standaard) vandaag. */
export function nextDays(count: number, from: Date = new Date()): string[] {
  const days: string[] = [];
  const start = toLocal(from);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return days;
}

export function durationMinutes(start: Date | string, end: Date | string): number {
  const a = typeof start === "string" ? new Date(start) : start;
  const b = typeof end === "string" ? new Date(end) : end;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** "1u30" / "45 min" */
export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}u` : `${h}u${String(m).padStart(2, "0")}`;
}
