import type { Metadata } from "next";
import { DayStrip } from "@/components/agenda/DayStrip";
import { DayTimeline, Legend } from "@/components/agenda/DayTimeline";
import { AppointmentCard } from "@/components/appointment/AppointmentCard";
import { requireProfile } from "@/lib/auth";
import { getAvailabilityRules, getBusySlots, getMyAppointments } from "@/lib/data";
import { dayKey, dayRange, fmtDay, nextDays } from "@/lib/dates";
import { DAY_STRIP_DAYS } from "@/lib/config";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const profile = await requireProfile();
  const params = await searchParams;

  const today = dayKey(new Date());
  const selected = typeof params.day === "string" ? params.day : today;
  const days = nextDays(DAY_STRIP_DAYS);

  const stripRange = { from: dayRange(days[0]).from, to: dayRange(days[days.length - 1]).to };
  const dayBounds = dayRange(selected);

  const [rules, busy, appointments] = await Promise.all([
    getAvailabilityRules(),
    getBusySlots(stripRange.from, stripRange.to),
    getMyAppointments(50),
  ]);

  const canSeeDetails = profile.role === "owner" || profile.role === "admin";

  const onSelectedDay = appointments.filter(
    (a) =>
      a.starts_at &&
      new Date(a.starts_at) >= dayBounds.from &&
      new Date(a.starts_at) < dayBounds.to &&
      a.status === "accepted",
  );

  const upcoming = appointments.filter(
    (a) => a.starts_at && new Date(a.starts_at) >= new Date() && a.status !== "cancelled",
  );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Agenda 📅</h1>
        <p className="text-sm text-muted-foreground">
          {canSeeDetails
            ? "Je ziet alles, met titels en namen."
            : "Je ziet wanneer Nesibe vrij of bezet is, plus je eigen afspraken."}
        </p>
      </header>

      <DayStrip days={days} rules={rules} busy={busy} selected={selected} hrefBase="/agenda?day=" />

      <section className="space-y-2">
        <h2 className="font-heading font-bold">{fmtDay(dayBounds.from)}</h2>
        <DayTimeline
          day={selected}
          rules={rules}
          busy={busy}
          appointments={onSelectedDay}
          canSeeDetails={canSeeDetails}
        />
        <Legend />
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Binnenkort</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nog niets gepland… tijd voor koffie? ☕
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 10).map((appt) => (
              <li key={appt.id}>
                <AppointmentCard appointment={appt} viewerId={profile.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
