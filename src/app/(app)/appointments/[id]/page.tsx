import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/people/Avatar";
import { UserName } from "@/components/people/UserName";
import { StatusPill } from "@/components/appointment/StatusPill";
import { AppointmentActions } from "@/components/appointment/AppointmentActions";
import { RsvpBar } from "@/components/appointment/RsvpBar";
import { PollBox } from "@/components/appointment/PollBox";
import { CounterBox } from "@/components/appointment/CounterBox";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getAppointment } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import { durationMinutes, fmtDuration, fmtLongDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Afspraak" };

export default async function AppointmentPage({ params }: PageProps<"/appointments/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const appointment = await getAppointment(id);
  if (!appointment) notFound();

  const supabase = await createClient();
  const meta = categoryMeta(appointment.category);
  const me = appointment.participants.find((p) => p.user_id === profile.id);
  const isCreator = appointment.created_by === profile.id;

  const [{ data: counter }, { data: options }, { data: votes }] = await Promise.all([
    supabase
      .from("counter_proposals")
      .select("*")
      .eq("appointment_id", id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    appointment.has_poll
      ? supabase.from("poll_options").select("*").eq("appointment_id", id).order("starts_at")
      : Promise.resolve({ data: [] as never[] }),
    appointment.has_poll
      ? supabase.from("poll_votes").select("option_id, user_id, vote")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className="flex size-12 items-center justify-center rounded-2xl text-2xl"
            style={{ backgroundColor: `${meta.color}22` }}
            aria-hidden
          >
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-extrabold">{appointment.title}</h1>
            <p className="text-xs text-muted-foreground">
              Aangevraagd door <UserName profile={appointment.creator} />
            </p>
          </div>
        </div>
        <StatusPill status={appointment.status} />
      </header>

      <Card>
        <CardContent className="space-y-2 py-4 text-sm">
          <p className="font-medium">
            {appointment.has_poll
              ? "🗳️ De groep stemt nog over de datum"
              : appointment.starts_at
                ? `📅 ${fmtLongDateTime(appointment.starts_at)}`
                : "Nog geen moment gekozen"}
          </p>
          {appointment.starts_at && appointment.ends_at ? (
            <p className="text-muted-foreground">
              ⏱️ {fmtDuration(durationMinutes(appointment.starts_at, appointment.ends_at))}
            </p>
          ) : null}
          {appointment.location_name ? (
            <p className="text-muted-foreground">📍 {appointment.location_name}</p>
          ) : null}
          {appointment.description ? (
            <p className="rounded-lg bg-muted px-3 py-2">{appointment.description}</p>
          ) : null}
          {appointment.decline_reason ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
              {appointment.decline_reason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {counter && isCreator ? <CounterBox counter={counter} /> : null}

      {appointment.has_poll && options && options.length > 0 ? (
        <PollBox
          appointmentId={id}
          options={options}
          votes={votes ?? []}
          myId={profile.id}
          canFinalize={profile.role === "owner" || isCreator}
        />
      ) : null}

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Wie gaat mee?</h2>
        <ul className="space-y-1">
          {appointment.participants.map((p) => (
            <li
              key={p.user_id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
            >
              <Avatar profile={p.profiles} size={32} />
              <UserName profile={p.profiles} className="flex-1 text-sm font-medium" />
              <span className="text-xs text-muted-foreground">
                {p.rsvp === "going"
                  ? "✅ komt"
                  : p.rsvp === "maybe"
                    ? "🤔 misschien"
                    : p.rsvp === "not_going"
                      ? "❌ kan niet"
                      : "⏳ nog niet"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {me && appointment.type === "group" && appointment.status !== "cancelled" ? (
        <RsvpBar appointmentId={id} current={me.rsvp} />
      ) : null}

      <AppointmentActions
        appointment={appointment}
        viewerRole={profile.role}
        isParticipant={Boolean(me)}
        checkedIn={Boolean(me?.checked_in_at)}
      />
    </div>
  );
}
