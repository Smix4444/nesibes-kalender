import Link from "next/link";
import { AppointmentCard } from "@/components/appointment/AppointmentCard";
import { RequestCard } from "@/components/appointment/RequestCard";
import { DayStrip } from "@/components/agenda/DayStrip";
import { FreeTodaySheet } from "@/components/agenda/FreeTodaySheet";
import { FreeTodayBanner } from "@/components/agenda/FreeTodayBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import {
  getActiveFreeToday,
  getAvailabilityRules,
  getBalance,
  getBusySlots,
  getGroups,
  getInbox,
  getMyAppointments,
  getOwnerItems,
} from "@/lib/data";
import { dayKey, dayRange, fmtTime, nextDays } from "@/lib/dates";
import { COIN_EMOJI, DAY_STRIP_DAYS } from "@/lib/config";

/** Afspraken tot een uur terug blijven staan; losgetrokken zodat de
 *  purity-regel van React niet over een Date.now() in de render valt. */
function recentCutoff(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

export default async function HomePage() {
  const profile = await requireProfile();
  return profile.role === "owner" ? <OwnerHome name={profile.display_name} /> : <FriendHome />;
}

// ----------------------------------------------------------- Nesibe 👑 ----

async function OwnerHome({ name }: { name: string }) {
  const today = dayKey(new Date());
  const { from, to } = dayRange(today);

  const [requests, items, appointments, groups] = await Promise.all([
    getInbox(),
    getOwnerItems(today),
    getMyAppointments(30),
    getGroups(),
  ]);

  const todayAppointments = appointments.filter(
    (a) =>
      a.status === "accepted" &&
      a.starts_at &&
      new Date(a.starts_at) >= from &&
      new Date(a.starts_at) < to,
  );
  const openTasks = items.tasks.filter((t) => !t.done).slice(0, 5);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl font-extrabold">Hoi {name} 👑</h1>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("nl-BE", { dateStyle: "full", timeZone: "Europe/Brussels" }).format(
            new Date(),
          )}
        </p>
      </header>

      <FreeTodaySheet groups={groups} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold">Aanvragen ({requests.length})</h2>
          {requests.length > 3 ? (
            <Link href="/inbox" className="text-sm font-semibold text-cig">
              Alles zien
            </Link>
          ) : null}
        </div>

        {requests.length === 0 ? (
          <Empty>Geen openstaande aanvragen. Rustig aan 🧘‍♀️</Empty>
        ) : (
          <ul className="space-y-3">
            {requests.slice(0, 3).map((request) => (
              <li key={request.id}>
                <RequestCard appointment={request} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Mijn dag</h2>
        {todayAppointments.length === 0 && items.blocks.length === 0 ? (
          <Empty>Niets gepland vandaag ✨</Empty>
        ) : (
          <ul className="space-y-2">
            {items.blocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5"
              >
                <span className="text-sm font-semibold">⛔ {block.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {block.starts_at ? fmtTime(block.starts_at) : ""}
                </span>
              </li>
            ))}
            {todayAppointments.map((appt) => (
              <li key={appt.id}>
                <AppointmentCard appointment={appt} viewerId="" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold">Taken</h2>
          <Link href="/planning" className="text-sm font-semibold text-cig">
            Planning
          </Link>
        </div>
        {openTasks.length === 0 ? (
          <Empty>Geen open taken 🎉</Empty>
        ) : (
          <ul className="space-y-1">
            {openTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium"
              >
                ☐ {task.title}
                {task.due_date ? (
                  <span className="ml-2 text-xs text-muted-foreground">tegen {task.due_date}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------- vrienden 🙂 ----

async function FriendHome() {
  const profile = await requireProfile();
  const days = nextDays(DAY_STRIP_DAYS);
  const from = dayRange(days[0]).from;
  const to = dayRange(days[6]).to;

  const [rules, busy, balance, appointments, freeToday] = await Promise.all([
    getAvailabilityRules(),
    getBusySlots(from, to),
    getBalance(profile.id),
    getMyAppointments(30),
    getActiveFreeToday(),
  ]);

  const cutoff = recentCutoff();
  const mine = appointments.filter(
    (a) => !a.starts_at || new Date(a.starts_at) >= cutoff,
  );
  const needsAnswer = mine.filter(
    (a) =>
      a.type === "group" &&
      a.participants.some((p) => p.user_id === profile.id && p.rsvp === "invited"),
  );

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">
            Hoi {profile.display_name} {profile.emoji}
          </h1>
          <p className="text-sm text-muted-foreground">Zin om iets te plannen?</p>
        </div>
        <Link
          href="/wallet"
          className="shrink-0 rounded-full bg-cig/10 px-3 py-1.5 text-sm font-bold text-cig"
        >
          {COIN_EMOJI} {balance}
        </Link>
      </header>

      {freeToday ? <FreeTodayBanner freeToday={freeToday} /> : null}

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Is Nesibe vrij?</h2>
        <DayStrip days={days.slice(0, 7)} rules={rules} busy={busy} />
      </section>

      <Card className="overflow-hidden border-0 bg-linear-to-br from-cig-2 to-cig text-white">
        <CardContent className="space-y-3 py-5">
          <p className="font-heading text-lg font-extrabold">Vraag een moment aan ☕</p>
          <Button
            render={<Link href="/new" />}
            variant="secondary"
            className="h-11 w-full font-bold"
          >
            Nieuwe aanvraag
          </Button>
        </CardContent>
      </Card>

      {needsAnswer.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading font-bold">Wacht op jouw antwoord</h2>
          <ul className="space-y-2">
            {needsAnswer.map((appt) => (
              <li key={appt.id}>
                <AppointmentCard appointment={appt} viewerId={profile.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Mijn afspraken</h2>
        {mine.length === 0 ? (
          <Empty>Nog geen afspraken… tijd voor koffie? ☕</Empty>
        ) : (
          <ul className="space-y-2">
            {mine.slice(0, 8).map((appt) => (
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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
