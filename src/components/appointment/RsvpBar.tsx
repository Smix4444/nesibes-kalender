"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setRsvp } from "@/lib/actions/appointments";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Rsvp = Database["public"]["Enums"]["rsvp_status"];

const CHOICES: { value: Rsvp; label: string }[] = [
  { value: "going", label: "✅ Ik kom" },
  { value: "maybe", label: "🤔 Misschien" },
  { value: "not_going", label: "❌ Kan niet" },
];

export function RsvpBar({ appointmentId, current }: { appointmentId: string; current: Rsvp }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-3 gap-2">
      {CHOICES.map((choice) => (
        <button
          key={choice.value}
          type="button"
          disabled={pending}
          aria-pressed={current === choice.value}
          onClick={() =>
            startTransition(async () => {
              const result = await setRsvp(appointmentId, choice.value);
              if (!result.ok) toast.error(result.error);
            })
          }
          className={cn(
            "min-h-12 rounded-xl border text-sm font-bold transition-colors",
            current === choice.value ? "border-cig bg-cig text-white" : "border-border bg-card",
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
