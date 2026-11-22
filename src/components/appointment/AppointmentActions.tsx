"use client";

import { useState, useTransition } from "react";
import { useNow } from "@/lib/use-now";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelAppointment, checkIn, respondAppointment } from "@/lib/actions/appointments";
import type { AppointmentWithPeople } from "@/lib/data";
import type { AppRole } from "@/lib/config";

export function AppointmentActions({
  appointment,
  viewerRole,
  isParticipant,
  checkedIn,
}: {
  appointment: AppointmentWithPeople;
  viewerRole: AppRole;
  isParticipant: boolean;
  checkedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const isOwner = viewerRole === "owner";
  const gone = ["cancelled", "declined", "expired"].includes(appointment.status);
  const start = appointment.starts_at ? new Date(appointment.starts_at) : null;
  const now = useNow();

  // Inchecken kan van 30 min voor tot 60 min na de start.
  const canCheckIn =
    appointment.status === "accepted" &&
    isParticipant &&
    !checkedIn &&
    start !== null &&
    now >= start.getTime() - 30 * 60000 &&
    now <= start.getTime() + 60 * 60000;

  if (gone) return null;

  return (
    <div className="space-y-2 pt-2">
      {canCheckIn ? (
        <Button
          className="h-12 w-full font-bold"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await checkIn(appointment.id);
              if (result.ok) {
                confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
                toast.success("Ingecheckt ⏰");
              } else toast.error(result.error);
            })
          }
        >
          📍 Ik ben er!
        </Button>
      ) : null}

      {checkedIn ? (
        <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-semibold text-success">
          ⏰ Je bent ingecheckt
        </p>
      ) : null}

      {isOwner && appointment.status === "pending" && !appointment.has_poll ? (
        <Button
          className="h-12 w-full font-bold"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await respondAppointment(appointment.id, "accept");
              if (result.ok) {
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
                toast.success("Bevestigd ✅");
              } else toast.error(result.error);
            })
          }
        >
          ✅ Accepteren
        </Button>
      ) : null}

      {cancelling ? (
        <div className="space-y-2">
          <Input
            value={reason}
            placeholder="Reden (optioneel)"
            onChange={(e) => setReason(e.target.value)}
            className="h-11"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1"
              disabled={pending}
              onClick={() => setCancelling(false)}
            >
              Toch niet
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelAppointment(appointment.id, reason);
                  if (result.ok) toast.success("Geannuleerd");
                  else toast.error(result.error);
                })
              }
            >
              Toch annuleren
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="h-11 w-full text-muted-foreground"
          onClick={() => setCancelling(true)}
        >
          Afspraak annuleren
        </Button>
      )}
    </div>
  );
}
