import Link from "next/link";
import {
  busyToMinutes,
  freeWindows,
  type AvailabilityRule,
  type BusySlot,
} from "@/lib/availability";
import { categoryMeta } from "@/lib/categories";
import { fmtTime, fromMinutes, toMinutes } from "@/lib/dates";
import type { AppointmentWithPeople } from "@/lib/data";
import { cn } from "@/lib/utils";

const DAY_START = 7 * 60;
const DAY_END = 24 * 60;
/** Hoogte van één uur in pixels — bepaalt meteen de schaal van de hele dag. */
const HOUR = 44;

const topOf = (minutes: number) => ((minutes - DAY_START) / 60) * HOUR;
const heightOf = (minutes: number) => (minutes / 60) * HOUR;

/**
 * Tijdlijn van één dag met een lijn per uur: groen waar Nesibe vrij is,
 * grijs met het woord "Bezet" waar ze dat niet is, en daarbovenop de
 * afspraken die jij mag zien.
 */
export function DayTimeline({
  day,
  rules,
  busy,
  appointments,
  canSeeDetails,
}: {
  day: string;
  rules: AvailabilityRule[];
  busy: BusySlot[];
  appointments: AppointmentWithPeople[];
  canSeeDetails: boolean;
}) {
  const free = freeWindows(day, rules, busy);
  const busyBlocks = busyToMinutes(day, busy).filter((b) => b.end > DAY_START && b.start < DAY_END);
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

  return (
    <div className="flex gap-2">
      {/* Uurlabels */}
      <ul className="w-10 shrink-0" style={{ height: topOf(DAY_END) }}>
        {hours.slice(0, -1).map((m) => (
          <li
            key={m}
            className="relative text-right text-[11px] font-medium text-muted-foreground tabular-nums"
            style={{ height: HOUR }}
          >
            <span className="absolute -top-1.5 right-0">{fromMinutes(m)}</span>
          </li>
        ))}
      </ul>

      <div
        className="relative flex-1 overflow-hidden rounded-xl border border-border bg-card"
        style={{ height: topOf(DAY_END) }}
      >
        {/* Lijn per uur */}
        {hours.slice(1, -1).map((m) => (
          <span
            key={m}
            className="absolute inset-x-0 border-t border-border/60"
            style={{ top: topOf(m) }}
            aria-hidden
          />
        ))}

        {/* Vrij */}
        {free.map((window, i) => (
          <div
            key={`free-${i}`}
            className="absolute inset-x-0 bg-success/10"
            style={{ top: topOf(window.start), height: heightOf(window.end - window.start) }}
          >
            {window.end - window.start >= 60 ? (
              <span className="absolute top-1 left-2 text-[10px] font-bold tracking-wide text-success uppercase">
                Vrij
              </span>
            ) : null}
          </div>
        ))}

        {/* Bezet — met het woord erbij, niet alleen een grijze balk */}
        {busyBlocks.map((block, i) => {
          const minutes = block.end - block.start;
          return (
            <div
              key={`busy-${i}`}
              className="absolute inset-x-0 flex items-center gap-1.5 bg-muted/90 px-2"
              style={{ top: topOf(block.start), height: heightOf(minutes) }}
            >
              <span
                className="h-full w-0.5 shrink-0 rounded-full bg-muted-foreground/40"
                aria-hidden
              />
              {minutes >= 45 ? (
                <span className="text-[11px] font-bold text-muted-foreground">
                  Bezet
                  <span className="ml-1 font-medium opacity-70">
                    {fromMinutes(block.start)}–{fromMinutes(block.end)}
                  </span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground">Bezet</span>
              )}
            </div>
          );
        })}

        {/* Jouw afspraken bovenop */}
        {appointments.map((appt) => {
          if (!appt.starts_at || !appt.ends_at) return null;
          const start = toMinutes(fmtTime(appt.starts_at));
          const end = toMinutes(fmtTime(appt.ends_at));
          const meta = categoryMeta(appt.category);
          const minutes = Math.max(end - start, 30);

          return (
            <Link
              key={appt.id}
              href={`/appointments/${appt.id}`}
              className="absolute right-1 left-1 overflow-hidden rounded-lg px-2 py-1 text-[11px] font-bold text-white shadow-warm-sm"
              style={{
                top: topOf(start),
                height: heightOf(minutes) - 2,
                backgroundColor: meta.color,
              }}
            >
              <span className="block truncate">
                {meta.emoji} {canSeeDetails ? appt.title : "Afspraak"}
              </span>
              {minutes >= 60 ? (
                <span className="block font-medium opacity-85">
                  {fmtTime(appt.starts_at)}–{fmtTime(appt.ends_at)}
                </span>
              ) : null}
            </Link>
          );
        })}

        {free.length === 0 && busyBlocks.length === 0 && appointments.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Deze dag is Nesibe niet beschikbaar.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Legenda onder de tijdlijn. */
export function Legend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-4 text-xs text-muted-foreground", className)}>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-success/30" aria-hidden /> vrij
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-muted" aria-hidden /> bezet
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-cig" aria-hidden /> jouw afspraak
      </li>
    </ul>
  );
}
