import Link from "next/link";
import { freeWindows, type AvailabilityRule, type BusySlot } from "@/lib/availability";
import { categoryMeta } from "@/lib/categories";
import { fmtTime, fromMinutes, toMinutes } from "@/lib/dates";
import type { AppointmentWithPeople } from "@/lib/data";
import { cn } from "@/lib/utils";

const DAY_START = 7 * 60;
const DAY_END = 24 * 60;
const SPAN = DAY_END - DAY_START;

const pct = (minutes: number) => ((minutes - DAY_START) / SPAN) * 100;

/**
 * Tijdlijn van één dag: groen waar Nesibe vrij is, grijs waar ze bezet is, en
 * daarboven de afspraken die jij mag zien.
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
  const hours = Array.from({ length: (DAY_END - DAY_START) / 180 + 1 }, (_, i) => DAY_START + i * 180);

  return (
    <div className="relative flex gap-2">
      <ul className="w-10 shrink-0 text-right text-[11px] text-muted-foreground">
        {hours.map((m) => (
          <li key={m} style={{ height: `${(180 / SPAN) * 100}%` }}>
            {fromMinutes(m)}
          </li>
        ))}
      </ul>

      <div className="relative h-[28rem] flex-1 overflow-hidden rounded-xl border border-border bg-muted/40">
        {free.map((window, i) => (
          <div
            key={`free-${i}`}
            className="absolute inset-x-0 bg-success/15"
            style={{ top: `${pct(window.start)}%`, height: `${(window.end - window.start) / SPAN * 100}%` }}
            aria-hidden
          />
        ))}

        {appointments.map((appt) => {
          if (!appt.starts_at || !appt.ends_at) return null;
          const start = toMinutes(fmtTime(appt.starts_at));
          const end = toMinutes(fmtTime(appt.ends_at));
          const meta = categoryMeta(appt.category);

          return (
            <Link
              key={appt.id}
              href={`/appointments/${appt.id}`}
              className="absolute right-1 left-1 overflow-hidden rounded-lg px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
              style={{
                top: `${pct(start)}%`,
                height: `${Math.max(((end - start) / SPAN) * 100, 4)}%`,
                backgroundColor: meta.color,
              }}
            >
              {meta.emoji} {canSeeDetails ? appt.title : "Bezet"}
              <span className="block font-normal opacity-80">{fmtTime(appt.starts_at)}</span>
            </Link>
          );
        })}

        {free.length === 0 && appointments.length === 0 ? (
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
    <ul className={cn("flex flex-wrap gap-3 text-xs text-muted-foreground", className)}>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-success/40" aria-hidden /> vrij
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
