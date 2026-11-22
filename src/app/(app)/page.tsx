import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppointmentCard } from "@/components/appointment/AppointmentCard";
import { RequestCard } from "@/components/appointment/RequestCard";
import { DayStrip } from "@/components/agenda/DayStrip";
import { FreeTodaySheet } from "@/components/agenda/FreeTodaySheet";
import { FreeTodayBanner } from "@/components/agenda/FreeTodayBanner";
import { EmptyState } from "@/components/common/EmptyState";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
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
import { dayKey, dayRange, fmt, fmtTime, nextDays } from "@/lib/dates";
import { COIN_EMOJI, DAY_STRIP_DAYS } from "@/lib/config";

/** Losgetrokken zodat React's purity-regel niet over Date.now() valt. */
function recentCutoff(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

export default async function HomePage() {
  const profile = await requireProfile();
  return profile.role === "owner" ? <OwnerHome name={profile.display_name} /> : <FriendHome />;
}

function Greeting({ name, emoji }: { name: string; emoji: string }) {
  const today = new Date();
  return (
    <div className="animate-rise">
      <p className="label-eyebrow">{fmt(today, "EEEE d MMMM")}</p>
      <h1 className="mt-1 font-heading text-[32px] leading-[1.1] font-extrabold">
        Hoi {name}{" "}
        <span className="inline-block align-baseline" aria-hidden>
          {emoji}
        </span>
      </h1>
    </div>
  );
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
  const dayItems = [
    ...items.blocks.map((b) => ({ kind: "block" as const, at: b.starts_at!, item: b })),
    ...todayAppointments.map((a) => ({ kind: "appt" as const, at: a.starts_at!, item: a })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="space-y-8">
      <Greeting name={name} emoji="👑" />

      <FreeTodaySheet groups={groups} />

      <Section
        label={requests.length ? `Inbox · ${requests.length}` : "Inbox"}
        action={requests.length > 3 ? "Alles" : undefined}
        actionHref="/inbox"
      >
        {requests.length === 0 ? (
          <div className="surface">
            <EmptyState icon="✦" title="Lege inbox">
              Geen openstaande aanvragen. Lekker rustig.
            </EmptyState>
          </div>
        ) : (
          <ul className="stagger space-y-3">
            {requests.slice(0, 3).map((request) => (
              <li key={request.id}>
                <RequestCard appointment={request} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Mijn dag">
        {dayItems.length === 0 ? (
          <div className="surface">
            <EmptyState icon="☀" title="Niets gepland">
              De dag is helemaal van jou.
            </EmptyState>
          </div>
        ) : (
          <ul className="stagger space-y-2">
            {dayItems.map(({ kind, item }) =>
              kind === "block" ? (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-3.5 py-3"
                >
                  <span className="label-eyebrow w-11 shrink-0 text-[10px]">
                    {fmtTime(item.starts_at!)}
                  </span>
                  <span className="truncate text-sm font-semibold text-muted-foreground">
                    {item.title}
                  </span>
                </li>
              ) : (
                <li key={item.id}>
                  <AppointmentCard
                    appointment={item as Parameters<typeof AppointmentCard>[0]["appointment"]}
                    viewerId=""
                  />
                </li>
              ),
            )}
          </ul>
        )}
      </Section>

      <Section label="Taken" action="Planning" actionHref="/planning">
        {openTasks.length === 0 ? (
          <div className="surface">
            <EmptyState icon="✓" title="Alles afgevinkt" />
          </div>
        ) : (
          <ul className="surface divide-y divide-border px-4">
            {openTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 py-3">
                <span className="size-1.5 shrink-0 rounded-full bg-cig" aria-hidden />
                <span className="flex-1 truncate text-sm font-medium">{task.title}</span>
                {task.due_date ? (
                  <span className="label-eyebrow text-[10px]">{task.due_date.slice(5)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
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
  const mine = appointments.filter((a) => !a.starts_at || new Date(a.starts_at) >= cutoff);
  const needsAnswer = mine.filter(
    (a) =>
      a.type === "group" &&
      a.participants.some((p) => p.user_id === profile.id && p.rsvp === "invited"),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <Greeting name={profile.display_name} emoji={profile.emoji} />
        <Link
          href="/wallet"
          aria-label={`${balance} çiğköftes, naar je portemonnee`}
          className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 shadow-warm-sm transition-transform active:scale-95"
        >
          <span aria-hidden>{COIN_EMOJI}</span>
          <span className="display-xl text-base">{balance}</span>
        </Link>
      </div>

      {freeToday ? <FreeTodayBanner freeToday={freeToday} /> : null}

      <Section label="Is Nesibe vrij?" action="Agenda" actionHref="/agenda">
        <DayStrip days={days.slice(0, 7)} rules={rules} busy={busy} />
      </Section>

      {/* Geen gradient: één volvlak rood leest rustiger en duurder. */}
      <Link
        href="/new"
        className="group relative block overflow-hidden rounded-3xl bg-cig p-6 text-white shadow-warm-lg transition-transform duration-200 active:scale-[0.98]"
      >
        <span
          className="absolute -top-12 -right-10 size-44 rotate-[-20deg] rounded-[45%] bg-white/10"
          aria-hidden
        />
        <p className="label-eyebrow text-white/70">Zin om af te spreken?</p>
        <p className="mt-2 max-w-[16ch] font-heading text-2xl leading-tight font-extrabold">
          Vraag een moment aan
        </p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-cig">
          Nieuwe aanvraag
          <ArrowUpRight className="size-4 transition-transform duration-200 group-active:translate-x-0.5 group-active:-translate-y-0.5" />
        </span>
      </Link>

      {needsAnswer.length > 0 ? (
        <Section label="Wacht op jou">
          <ul className="stagger space-y-2.5">
            {needsAnswer.map((appt) => (
              <li key={appt.id}>
                <AppointmentCard appointment={appt} viewerId={profile.id} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section label="Jouw afspraken">
        {mine.length === 0 ? (
          <div className="surface">
            <EmptyState
              icon="☕"
              title="Nog niets gepland"
              action={
                <Button nativeButton={false} render={<Link href="/new" />} className="h-11 px-5 font-bold">
                  Plan iets leuks
                </Button>
              }
            >
              Tijd voor koffie met Nesibe?
            </EmptyState>
          </div>
        ) : (
          <ul className="stagger space-y-2.5">
            {mine.slice(0, 8).map((appt) => (
              <li key={appt.id}>
                <AppointmentCard appointment={appt} viewerId={profile.id} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
