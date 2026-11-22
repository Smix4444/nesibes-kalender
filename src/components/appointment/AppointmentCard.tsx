import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/people/Avatar";
import { StatusPill } from "@/components/appointment/StatusPill";
import { categoryMeta } from "@/lib/categories";
import { fmtDateTime, fmtDuration, durationMinutes } from "@/lib/dates";
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

  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors active:bg-muted/50"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: `${meta.color}22` }}
        aria-hidden
      >
        {meta.emoji}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-heading font-bold">{appointment.title}</p>
          <StatusPill status={appointment.status} className="shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground">
          {appointment.has_poll
            ? "🗳️ Datum nog niet gekozen"
            : appointment.starts_at
              ? `${fmtDateTime(appointment.starts_at)} · ${fmtDuration(
                  durationMinutes(appointment.starts_at, appointment.ends_at ?? appointment.starts_at),
                )}`
              : "Nog geen moment"}
        </p>

        {appointment.location_name ? (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {appointment.location_name}
          </p>
        ) : null}

        {others.length > 0 ? (
          <ul className="flex -space-x-1.5 pt-0.5">
            {others.slice(0, 5).map((p) => (
              <li key={p.user_id}>
                <Avatar profile={p.profiles} size={22} className="ring-2 ring-card" />
              </li>
            ))}
            {others.length > 5 ? (
              <li className="pl-2.5 text-xs text-muted-foreground">+{others.length - 5}</li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Link>
  );
}
