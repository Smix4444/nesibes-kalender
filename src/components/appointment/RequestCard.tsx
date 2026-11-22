"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Avatar } from "@/components/people/Avatar";
import { UserName } from "@/components/people/UserName";
import { StatusPill } from "@/components/appointment/StatusPill";
import { CounterSheet } from "@/components/appointment/CounterSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { categoryMeta } from "@/lib/categories";
import { COIN_EMOJI } from "@/lib/config";
import { durationMinutes, fmtDuration, fmtLongDateTime } from "@/lib/dates";
import { respondAppointment } from "@/lib/actions/appointments";
import type { AppointmentWithPeople } from "@/lib/data";

/** Eén aanvraag in Nesibe's inbox, met ✅ / 🔁 / ❌. */
export function RequestCard({ appointment }: { appointment: AppointmentWithPeople }) {
  const [pending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const meta = categoryMeta(appointment.category);

  function respond(action: "accept" | "decline", why?: string) {
    startTransition(async () => {
      const result = await respondAppointment(appointment.id, action, why);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (action === "accept") {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        toast.success("Afspraak bevestigd ✅");
      } else {
        toast.success("Geweigerd — çiğköftes gaan terug");
      }
      setDeclining(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start gap-3">
          <Avatar profile={appointment.creator} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <UserName profile={appointment.creator} className="text-sm font-bold" />
              {appointment.is_priority ? (
                <span className="rounded-full bg-cig/15 px-1.5 text-[10px] font-bold text-cig">
                  {COIN_EMOJI} PRIORITY
                </span>
              ) : null}
            </div>
            <p className="font-heading font-extrabold">
              {meta.emoji} {appointment.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {appointment.starts_at
                ? `${fmtLongDateTime(appointment.starts_at)} · ${fmtDuration(
                    durationMinutes(appointment.starts_at, appointment.ends_at ?? appointment.starts_at),
                  )}`
                : "Datum nog te kiezen"}
            </p>
          </div>
          <StatusPill status={appointment.status} />
        </div>

        {appointment.description ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{appointment.description}</p>
        ) : null}

        {appointment.status === "auction" ? (
          <Button
            render={<Link href={`/auctions/${appointment.auction_id}`} />}
            className="h-11 w-full"
          >
            ⚔️ Naar de veiling
          </Button>
        ) : declining ? (
          <div className="space-y-2">
            <Input
              value={reason}
              placeholder="Waarom niet? (optioneel)"
              onChange={(e) => setReason(e.target.value)}
              className="h-11"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setDeclining(false)}
                disabled={pending}
              >
                Toch niet
              </Button>
              <Button
                variant="destructive"
                className="h-11 flex-1"
                onClick={() => respond("decline", reason)}
                disabled={pending}
              >
                Weigeren
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Button className="h-11" disabled={pending} onClick={() => respond("accept")}>
              ✅ Ja
            </Button>
            <CounterSheet appointmentId={appointment.id} startsAt={appointment.starts_at} />
            <Button
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => setDeclining(true)}
            >
              ❌ Nee
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
