import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { Avatar } from "@/components/people/Avatar";
import { StatusPill } from "@/components/appointment/StatusPill";
import { categoryMeta } from "@/lib/categories";
import { fmt, fmtDuration, durationMinutes } from "@/lib/dates";
import type { AppointmentWithPeople } from "@/lib/data";

export function AppointmentCard({
  appointment,
  viewerId,
}: {
  appointment: AppointmentWithPeople;
  viewerId: string;
}) {
  const meta = categoryMeta(appointment.category);
  const others = appointment.participants.filter((p) => p.user_id !== viewerId);
  const starts = appointment.starts_at;

  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="group surface relative flex gap-3.5 overflow-hidden p-3.5 transition-all duration-200 active:scale-[0.985] active:shadow-warm-sm"
    >
      {/* Kleurstreep per categorie: herkenbaar zonder dat het schreeuwt. */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />

      {/* Datumblokje i.p.v. nog een emoji-vierkant. */}
      <div className="ml-1 flex w-11 shrink-0 flex-col items-center justify-center">
        {starts ? (
          <>
            <span className="label-eyebrow text-[10px] leading-none">{fmt(starts, "EEE")}</span>
            <span className="display-xl mt-1 text-2xl">{fmt(starts, "d")}</span>
            <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {fmt(starts, "MMM")}
            </span>
          </>
        ) : (
          <span className="text-2xl opacity-40" aria-hidden>
            🗳️
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate font-heading text-[15px] leading-snug font-bold">
            <span className="mr-1" aria-hidden>
              {meta.emoji}
            </span>
            {appointment.title}
          </p>
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-active:translate-x-0.5" />
        </div>

        <p className="text-[13px] font-medium text-muted-foreground">
          {appointment.has_poll
            ? "Datum nog niet gekozen"
            : starts
              ? `${fmt(starts, "HH:mm")} · ${fmtDuration(
                  durationMinutes(starts, appointment.ends_at ?? starts),
                )}`
              : "Nog geen moment"}
        </p>

        {appointment.location_name ? (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" strokeWidth={2} />
            {appointment.location_name}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <StatusPill status={appointment.status} />
          {others.length > 0 ? (
            <ul className="flex -space-x-2">
              {others.slice(0, 4).map((p) => (
                <li key={p.user_id}>
                  <Avatar profile={p.profiles} size={22} className="ring-2 ring-card" />
                </li>
              ))}
              {others.length > 4 ? (
                <li className="flex size-[22px] items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-2 ring-card">
                  +{others.length - 4}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
