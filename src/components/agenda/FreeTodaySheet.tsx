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
import { broadcastFreeToday } from "@/lib/actions/appointments";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

/** Nesibe roept om dat ze vrij is; de doelgroep krijgt meteen een push. */
export function FreeTodaySheet({ groups }: { groups: Tables<"groups">[] }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${now.getMinutes() < 30 ? "30" : "00"}`;
  });
  const [to, setTo] = useState("22:00");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button className="h-14 w-full bg-linear-to-br from-cig-2 to-cig text-base font-extrabold text-white">
            ✨ Ik ben vrij vandaag
          </Button>
        }
      />
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="font-heading">Wie wil er afspreken?</DrawerTitle>
            <DrawerDescription>
              Iedereen in de doelgroep krijgt een melding met een knop om meteen iets aan te vragen.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ft-from">Van</Label>
                <Input
                  id="ft-from"
                  type="time"
                  step={900}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ft-to">Tot</Label>
                <Input
                  id="ft-to"
                  type="time"
                  step={900}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ft-message">Berichtje</Label>
              <Input
                id="ft-message"
                value={message}
                maxLength={140}
                placeholder="wie gaat mee koffie drinken?"
                onChange={(e) => setMessage(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Naar wie?</Label>
              <ul className="flex flex-wrap gap-2">
                <li>
                  <GroupChip active={groupId === null} onClick={() => setGroupId(null)}>
                    🫂 Iedereen
                  </GroupChip>
                </li>
                {groups.map((group) => (
                  <li key={group.id}>
                    <GroupChip active={groupId === group.id} onClick={() => setGroupId(group.id)}>
                      {group.emoji} {group.name}
                    </GroupChip>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DrawerFooter>
            <Button
              className="h-12 font-bold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await broadcastFreeToday(from, to, message, groupId);
                  if (result.ok) {
                    toast.success("Iedereen is verwittigd ✨");
                    setOpen(false);
                  } else toast.error(result.error);
                })
              }
            >
              {pending ? "Versturen…" : "Verstuur oproep ✨"}
            </Button>
            <DrawerClose render={<Button variant="ghost" className="h-11">Annuleren</Button>} />
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function GroupChip({
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
