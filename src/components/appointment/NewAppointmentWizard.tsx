"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DayStrip } from "@/components/agenda/DayStrip";
import { PeoplePicker } from "@/components/people/PeoplePicker";
import { LocationPicker, type ChosenPlace } from "@/components/map/LocationPicker";
import { CATEGORY_LIST, type AppointmentCategory } from "@/lib/categories";
import { COIN_EMOJI, DURATION_CHOICES, ROLE_META, type AppRole } from "@/lib/config";
import { freeWindows, startOptions, type AvailabilityRule, type BusySlot } from "@/lib/availability";
import { atLocalTime, fmt, fmtDuration } from "@/lib/dates";
import { createGroupActivity, requestAppointment, requestSeries } from "@/lib/actions/appointments";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Mode = "solo" | "group";

export function NewAppointmentWizard({
  role,
  balance,
  days,
  rules,
  busy,
  demand,
  people,
  groups,
  savedPlaces,
  ownerId,
  prefill,
}: {
  role: AppRole;
  balance: number;
  days: string[];
  rules: AvailabilityRule[];
  busy: BusySlot[];
  /** aantal openstaande aanvragen per dag, voor de veiling-waarschuwing */
  demand: Record<string, number>;
  people: Pick<Tables<"profiles">, "id" | "display_name" | "emoji" | "color" | "avatar_url" | "role">[];
  groups: (Tables<"groups"> & { group_members: { user_id: string }[] })[];
  savedPlaces: Tables<"saved_places">[];
  /** Nesibe; nodig om te weten of zij meedoet. */
  ownerId: string | null;
  prefill?: { day?: string; title?: string; category?: AppointmentCategory; ideaId?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>("solo");
  const [category, setCategory] = useState<AppointmentCategory>(prefill?.category ?? "koffie");
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [day, setDay] = useState(prefill?.day ?? days[0]);
  const [duration, setDuration] = useState(60);
  const [time, setTime] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(false);
  const [place, setPlace] = useState<ChosenPlace | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [freq, setFreq] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [until, setUntil] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [userIds, setUserIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const freePriority = ROLE_META[role].freePriority;
  const canAfford = freePriority || balance >= 1;

  // Nesibe doet mee als ze los getagd is of in een getagde groep zit.
  const nesibeJoins = useMemo(() => {
    if (mode === "solo") return true;
    if (!ownerId) return false;
    if (userIds.includes(ownerId)) return true;
    return groups.some(
      (g) => groupIds.includes(g.id) && g.group_members.some((m) => m.user_id === ownerId),
    );
  }, [mode, ownerId, userIds, groupIds, groups]);

  // Zonder Nesibe hoeven haar vrije uren niet te gelden: dan mag de hele dag.
  const windows = useMemo(
    () => (nesibeJoins ? freeWindows(day, rules, busy) : [{ start: 8 * 60, end: 23 * 60 }]),
    [nesibeJoins, day, rules, busy],
  );
  const times = useMemo(() => startOptions(windows, duration), [windows, duration]);

  const steps: { key: string; label: string }[] = [
    { key: "what", label: "Wat?" },
    { key: "when", label: "Wanneer?" },
    { key: "where", label: "Waar?" },
    ...(mode === "group" ? [{ key: "who", label: "Wie?" }] : []),
    { key: "extra", label: "Extra" },
    { key: "review", label: "Klaar?" },
  ];
  const current = steps[step];

  const canContinue =
    current.key === "what"
      ? title.trim().length > 0
      : current.key === "when"
        ? time !== null
        : true;

  function submit() {
    if (!time) return;
    const startsAt = atLocalTime(day, time);
    const endsAt = new Date(startsAt.getTime() + duration * 60000);

    startTransition(async () => {
      const result =
        mode === "solo" && repeat
          ? await requestSeries({
              title: title.trim(),
              category,
              freq,
              first_starts_at: startsAt.toISOString(),
              duration_minutes: duration,
              until_date: until,
              location_name: place?.name ?? null,
              location_address: place?.address ?? null,
              lat: place?.lat ?? null,
              lng: place?.lng ?? null,
            })
          : mode === "group"
          ? await createGroupActivity({
              title: title.trim(),
              category,
              description,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              location_name: place?.name ?? null,
              location_address: place?.address ?? null,
              lat: place?.lat ?? null,
              lng: place?.lng ?? null,
              user_ids: userIds,
              group_ids: groupIds,
            })
          : await requestAppointment({
              title: title.trim(),
              category,
              description,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              location_name: place?.name ?? null,
              location_address: place?.address ?? null,
              lat: place?.lat ?? null,
              lng: place?.lng ?? null,
              is_priority: priority,
              idea_id: prefill?.ideaId ?? null,
            });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
      toast.success(
        repeat && mode === "solo"
          ? "Vaste afspraak aangevraagd! 🔁"
          : mode === "group"
            ? "Uitnodiging verstuurd! 🎉"
            : "Aanvraag verstuurd! 🤞",
      );
      // Een reeks heeft nog geen afspraakpagina tot Nesibe ja zegt.
      router.push(result.id && !(repeat && mode === "solo") ? `/appointments/${result.id}` : "/");
    });
  }

  return (
    <div className="space-y-4">
      {/* voortgang */}
      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            aria-label="Vorige stap"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-cig" : "bg-muted")}
            />
          ))}
        </div>
      </div>

      <h1 className="font-heading text-2xl font-extrabold">{current.label}</h1>

      {current.key === "what" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <ModeButton active={mode === "solo"} onClick={() => setMode("solo")} emoji="🙋‍♀️" label="Met Nesibe" />
            <ModeButton active={mode === "group"} onClick={() => setMode("group")} emoji="🫶" label="Met de groep" />
          </div>

          <div className="space-y-2">
            <Label>Wat gaan jullie doen?</Label>
            <ul className="grid grid-cols-3 gap-2">
              {CATEGORY_LIST.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => setCategory(c.key)}
                    aria-pressed={category === c.key}
                    className={cn(
                      "flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-colors",
                      category === c.key ? "border-cig bg-cig/10" : "border-border bg-card",
                    )}
                  >
                    <span className="text-xl" aria-hidden>{c.emoji}</span>
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Geef het een naam</Label>
            <Input
              id="title"
              value={title}
              maxLength={80}
              placeholder="Coffee date bij Kolonel Koffie"
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
            />
          </div>
        </div>
      ) : null}

      {current.key === "when" ? (
        <div className="space-y-4">
          <DayStrip days={days} rules={rules} busy={busy} selected={day} hrefBase={null} onSelect={(d) => { setDay(d); setTime(null); }} />

          {demand[day] > 0 && mode === "solo" ? (
            <p className="rounded-xl bg-cig/10 px-3 py-2 text-sm font-medium text-cig">
              ⚔️ Er ligt al een aanvraag op deze dag, je komt in een veiling.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Hoe lang?</Label>
            <ul className="flex flex-wrap gap-2">
              {DURATION_CHOICES.map((d) => (
                <li key={d}>
                  <Chip active={duration === d} onClick={() => { setDuration(d); setTime(null); }}>
                    {fmtDuration(d)}
                  </Chip>
                </li>
              ))}
            </ul>
          </div>

          {mode === "solo" ? (
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-heading font-bold">🔁 Herhaal dit</p>
                    <p className="text-xs text-muted-foreground">
                      Elke week hetzelfde moment, tot je stopt.
                    </p>
                  </div>
                  <Switch checked={repeat} onCheckedChange={setRepeat} aria-label="Herhalen" />
                </div>

                {repeat ? (
                  <>
                    <ul className="flex flex-wrap gap-2">
                      {([
                        ["weekly", "Elke week"],
                        ["biweekly", "Om de 2 weken"],
                        ["monthly", "Elke maand"],
                      ] as const).map(([value, label]) => (
                        <li key={value}>
                          <Chip active={freq === value} onClick={() => setFreq(value)}>
                            {label}
                          </Chip>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-1.5">
                      <Label htmlFor="until">Tot wanneer? (max. 6 maanden)</Label>
                      <Input
                        id="until"
                        type="date"
                        value={until}
                        onChange={(e) => setUntil(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {!nesibeJoins ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              Nesibe doet niet mee, dus je bent niet gebonden aan haar vrije uren.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Hoe laat?</Label>
            {times.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                Nesibe is deze dag niet zo lang vrij. Probeer een kortere duur of een andere dag.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {times.map((t) => (
                  <li key={t}>
                    <Chip active={time === t} onClick={() => setTime(t)}>
                      {t}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {current.key === "where" ? (
        <div className="space-y-3">
          <LocationPicker value={place} onChange={setPlace} savedPlaces={savedPlaces} />
          <p className="text-xs text-muted-foreground">
            Een plek kiezen mag, maar hoeft niet.
          </p>
        </div>
      ) : null}

      {current.key === "who" ? (
        <PeoplePicker
          people={people}
          groups={groups}
          userIds={userIds}
          groupIds={groupIds}
          onUserIds={setUserIds}
          onGroupIds={setGroupIds}
        />
      ) : null}

      {current.key === "extra" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Nog iets erbij? (optioneel)</Label>
            <Textarea
              id="description"
              value={description}
              maxLength={500}
              rows={4}
              placeholder="Ik trakteer ☕"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {mode === "solo" ? (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-heading font-bold">{COIN_EMOJI} Priority</p>
                  <p className="text-xs text-muted-foreground">
                    {freePriority
                      ? `Gratis voor jou ${ROLE_META[role].emoji}`
                      : `Kost 1 çiğköfte (je hebt er ${balance})`}
                  </p>
                </div>
                <Switch
                  checked={priority}
                  disabled={!canAfford}
                  onCheckedChange={setPriority}
                  aria-label="Priority-aanvraag"
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {current.key === "review" ? (
        <Card>
          <CardContent className="space-y-2 py-5 text-sm">
            <Row label="Wat">{title}</Row>
            <Row label="Wanneer">
              {fmt(atLocalTime(day, time ?? "12:00"), "EEEE d MMMM 'om' HH:mm")} ·{" "}
              {fmtDuration(duration)}
            </Row>
            <Row label="Met">
              {mode === "solo"
                ? "Nesibe 👑"
                : `${userIds.length + groupIds.length} getagd${nesibeJoins ? ", incl. Nesibe 👑" : ""}`}
            </Row>
            {place ? <Row label="Waar">📍 {place.name}</Row> : null}
            {repeat && mode === "solo" ? (
              <Row label="Herhaalt">
                {freq === "weekly" ? "elke week" : freq === "biweekly" ? "om de 2 weken" : "elke maand"}{" "}
                tot {until}
              </Row>
            ) : null}
            {priority ? <Row label="Priority">{COIN_EMOJI} ja</Row> : null}
            {description ? <Row label="Notitie">{description}</Row> : null}
          </CardContent>
        </Card>
      ) : null}

      <Button
        className="h-12 w-full text-base font-bold"
        disabled={!canContinue || pending}
        onClick={() => (step === steps.length - 1 ? submit() : setStep(step + 1))}
      >
        {pending
          ? "Versturen…"
          : step === steps.length - 1
            ? repeat && mode === "solo"
              ? "Vaste afspraak aanvragen 🔁"
              : mode === "group"
                ? "Uitnodiging versturen 🎉"
                : "Aanvraag versturen 🤞"
            : "Verder"}
      </Button>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors",
        active ? "border-cig bg-cig/10 text-cig" : "border-border bg-card",
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-cig bg-cig text-white" : "border-border bg-card",
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </p>
  );
}
