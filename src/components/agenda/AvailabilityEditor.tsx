"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAvailabilityRule, deleteAvailabilityRule } from "@/lib/actions/owner";
import type { Tables } from "@/lib/database.types";

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

/** "16:00:00" -> "16:00" */
const hhmm = (t: string) => t.slice(0, 5);

export function AvailabilityEditor({ rules }: { rules: Tables<"availability_rules">[] }) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {DAYS.map((label, weekday) => {
        const dayRules = rules.filter((r) => r.weekday === weekday);

        return (
          <Card key={weekday}>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold">{label}</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9"
                  onClick={() => setOpenDay(openDay === weekday ? null : weekday)}
                  aria-expanded={openDay === weekday}
                >
                  <Plus className="size-4" /> Venster
                </Button>
              </div>

              {dayRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Niet beschikbaar</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {dayRules.map((rule) => (
                    <li key={rule.id}>
                      <span className="inline-flex items-center gap-2 rounded-full bg-success/15 py-1.5 pr-1.5 pl-3 text-sm font-semibold text-success">
                        {hhmm(rule.start_time)} – {hhmm(rule.end_time)}
                        <button
                          type="button"
                          aria-label={`Verwijder ${hhmm(rule.start_time)} tot ${hhmm(rule.end_time)} op ${label}`}
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteAvailabilityRule(rule.id);
                              if (!result.ok) toast.error(result.error);
                            })
                          }
                          className="flex size-7 items-center justify-center rounded-full hover:bg-success/20"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {openDay === weekday ? (
                <AddRuleForm
                  weekday={weekday}
                  onDone={() => setOpenDay(null)}
                  disabled={pending}
                />
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AddRuleForm({
  weekday,
  onDone,
  disabled,
}: {
  weekday: number;
  onDone: () => void;
  disabled: boolean;
}) {
  const [from, setFrom] = useState("16:00");
  const [to, setTo] = useState("22:00");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-end gap-2 border-t border-border pt-3">
      <div className="flex-1 space-y-1">
        <Label htmlFor={`from-${weekday}`} className="text-xs">
          Van
        </Label>
        <Input
          id={`from-${weekday}`}
          type="time"
          value={from}
          step={900}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11"
        />
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor={`to-${weekday}`} className="text-xs">
          Tot
        </Label>
        <Input
          id={`to-${weekday}`}
          type="time"
          value={to}
          step={900}
          onChange={(e) => setTo(e.target.value)}
          className="h-11"
        />
      </div>
      <Button
        className="h-11"
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            const result = await addAvailabilityRule(weekday, from, to);
            if (result.ok) onDone();
            else toast.error(result.error);
          })
        }
      >
        Opslaan
      </Button>
    </div>
  );
}
