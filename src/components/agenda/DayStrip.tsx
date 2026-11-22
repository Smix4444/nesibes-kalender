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
    <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {days.map((day, index) => {
        const ratio = freeRatio(day, rules, busy);
        const isToday = index === 0;
        const active = selected === day;
        const busyDay = ratio === 0;

        const content = (
          <>
            <span
              className={cn(
                "text-[10px] font-bold tracking-[0.1em] uppercase",
                active ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {isToday ? "vandaag" : fmt(`${day}T12:00:00Z`, "EEEEEE")}
            </span>
            <span className="display-xl mt-1.5 text-[22px]">{Number(day.slice(8, 10))}</span>
            <span
              className={cn(
                "mt-2 block h-1 w-full overflow-hidden rounded-full",
                active ? "bg-white/25" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "block h-full rounded-full transition-all duration-500",
                  active ? "bg-white" : busyDay ? "bg-transparent" : "bg-success",
                )}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </span>
          </>
        );

        const className = cn(
          "flex min-h-[74px] w-[52px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition-all duration-200 active:scale-95",
          active
            ? "border-cig bg-cig text-white shadow-warm-md"
            : "border-border bg-card shadow-warm-sm",
          busyDay && !active && "opacity-45",
        );

        const label = `${fmt(`${day}T12:00:00Z`, "EEEE d MMMM")}, ${busyDay ? "bezet" : "vrij"}`;

        return (
          <li key={day}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(day)} aria-pressed={active} aria-label={label} className={className}>
                {content}
              </button>
            ) : (
              <Link href={`${hrefBase}${day}`} aria-label={label} className={className}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
