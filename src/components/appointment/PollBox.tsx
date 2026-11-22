"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { finalizePoll, votePoll } from "@/lib/actions/appointments";
import { fmtLongDateTime } from "@/lib/dates";
import type { Database, Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Vote = Database["public"]["Enums"]["poll_vote_value"];

const CHOICES: { value: Vote; label: string }[] = [
  { value: "yes", label: "✅" },
  { value: "maybe", label: "🤔" },
  { value: "no", label: "❌" },
];

export function PollBox({
  appointmentId,
  options,
  votes,
  myId,
  canFinalize,
}: {
  appointmentId: string;
  options: Tables<"poll_options">[];
  votes: { option_id: string; user_id: string; vote: Vote }[];
  myId: string;
  canFinalize: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-2">
      <h2 className="font-heading font-bold">🗳️ Wanneer kan jij?</h2>

      <ul className="space-y-2">
        {options.map((option) => {
          const optionVotes = votes.filter((v) => v.option_id === option.id);
          const yes = optionVotes.filter((v) => v.vote === "yes").length;
          const mine = optionVotes.find((v) => v.user_id === myId)?.vote;
          const total = Math.max(optionVotes.length, 1);

          return (
            <li key={option.id}>
              <Card>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{fmtLongDateTime(option.starts_at)}</p>
                    <span className="text-xs text-muted-foreground">{yes}× ✅</span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${(yes / total) * 100}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    {CHOICES.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        disabled={pending}
                        aria-label={`Stem ${choice.value} op ${fmtLongDateTime(option.starts_at)}`}
                        aria-pressed={mine === choice.value}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await votePoll(option.id, choice.value, appointmentId);
                            if (!result.ok) toast.error(result.error);
                          })
                        }
                        className={cn(
                          "min-h-11 flex-1 rounded-lg border text-base",
                          mine === choice.value ? "border-cig bg-cig/10" : "border-border",
                        )}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>

                  {canFinalize ? (
                    <Button
                      variant="outline"
                      className="h-10 w-full"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await finalizePoll(appointmentId, option.id);
                          if (result.ok) toast.success("Datum vastgelegd 📅");
                          else toast.error(result.error);
                        })
                      }
                    >
                      Kies deze 📅
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
