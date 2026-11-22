"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { counterPropose } from "@/lib/actions/appointments";
import { atLocalTime, dayKey, fmtTime } from "@/lib/dates";
import { DURATION_CHOICES } from "@/lib/config";
import { fmtDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Bottom sheet waarin Nesibe een ander moment voorstelt. */
export function CounterSheet({
  appointmentId,
  startsAt,
}: {
  appointmentId: string;
  startsAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(startsAt ? dayKey(startsAt) : dayKey(new Date()));
  const [time, setTime] = useState(startsAt ? fmtTime(startsAt) : "16:00");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const start = atLocalTime(day, time);
    const end = new Date(start.getTime() + duration * 60000);

    startTransition(async () => {
      const result = await counterPropose(
        appointmentId,
        start.toISOString(),
        end.toISOString(),
        message,
      );
      if (result.ok) {
        toast.success("Tegenvoorstel verstuurd 🔁");
        setOpen(false);
      } else toast.error(result.error);
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button variant="outline" className="h-11">
            🔁 Ander
          </Button>
        }
      />
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="font-heading">Ander moment voorstellen</DrawerTitle>
            <DrawerDescription>
              De aanvrager krijgt een melding en kan akkoord gaan of iets anders voorstellen.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="counter-day">Dag</Label>
                <Input
                  id="counter-day"
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="counter-time">Tijd</Label>
                <Input
                  id="counter-time"
                  type="time"
                  step={900}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hoe lang?</Label>
              <ul className="flex flex-wrap gap-2">
                {DURATION_CHOICES.map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onClick={() => setDuration(d)}
                      aria-pressed={duration === d}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-sm font-semibold",
                        duration === d ? "border-cig bg-cig text-white" : "border-border bg-card",
                      )}
                    >
                      {fmtDuration(d)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="counter-message">Berichtje (optioneel)</Label>
              <Input
                id="counter-message"
                value={message}
                maxLength={200}
                placeholder="liever namiddag?"
                onChange={(e) => setMessage(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <DrawerFooter>
            <Button className="h-12 font-bold" disabled={pending} onClick={submit}>
              {pending ? "Versturen…" : "Voorstel versturen 🔁"}
            </Button>
            <DrawerClose render={<Button variant="ghost" className="h-11">Annuleren</Button>} />
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
