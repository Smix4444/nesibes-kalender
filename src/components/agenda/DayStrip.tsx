"use client";

import Link from "next/link";
import { freeRatio, type AvailabilityRule, type BusySlot } from "@/lib/availability";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Horizontale strip met per dag een vrij/bezet-balkje. Tikken opent de wizard
 * (of, met `hrefBase`, een andere pagina) met die dag ingevuld.
 */
export function DayStrip({
  days,
  rules,
  busy,
  selected,
  hrefBase = "/new?day=",
  onSelect,
}: {
  days: string[];
  rules: AvailabilityRule[];
  busy: BusySlot[];
  selected?: string;
  hrefBase?: string | null;
  onSelect?: (day: string) => void;
}) {
  return (
    <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((day) => {
        const ratio = freeRatio(day, rules, busy);
        const isToday = day === days[0];
        const active = selected === day;

        const content = (
          <>
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              {isToday ? "vandaag" : fmt(`${day}T12:00:00Z`, "EEE")}
            </span>
            <span className="font-heading text-lg leading-none font-extrabold">
              {Number(day.slice(8, 10))}
            </span>
            <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", ratio > 0 ? "bg-success" : "bg-transparent")}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </span>
          </>
        );

        const className = cn(
          "flex min-h-16 w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition-colors",
          active ? "border-cig bg-cig/10" : "border-border bg-card",
          ratio === 0 && "opacity-50",
        );

        return (
          <li key={day}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={active}
                aria-label={`${fmt(`${day}T12:00:00Z`, "EEEE d MMMM")}, ${ratio === 0 ? "bezet" : "vrij"}`}
                className={className}
              >
                {content}
              </button>
            ) : (
              <Link
                href={`${hrefBase}${day}`}
                aria-label={`${fmt(`${day}T12:00:00Z`, "EEEE d MMMM")}, ${ratio === 0 ? "bezet" : "vrij"}`}
                className={className}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
