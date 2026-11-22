"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { respondCounter } from "@/lib/actions/appointments";
import { fmtLongDateTime } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

/** Nesibe stelde een ander moment voor — de aanvrager beslist. */
export function CounterBox({ counter }: { counter: Tables<"counter_proposals"> }) {
  const [pending, startTransition] = useTransition();

  function respond(action: "accept" | "reject") {
    startTransition(async () => {
      const result = await respondCounter(counter.id, action);
      if (result.ok) {
        toast.success(action === "accept" ? "Afgesproken! ✅" : "Afspraak geannuleerd");
      } else toast.error(result.error);
    });
  }

  return (
    <Card className="border-cig-2/40 bg-cig-2/10">
      <CardContent className="space-y-3 py-4">
        <div>
          <p className="font-heading font-bold">🔁 Nesibe stelt voor</p>
          <p className="text-sm">{fmtLongDateTime(counter.starts_at)}</p>
          {counter.message ? (
            <p className="text-sm text-muted-foreground">&ldquo;{counter.message}&rdquo;</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11" disabled={pending} onClick={() => respond("accept")}>
            Oké! ✅
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => respond("reject")}
          >
            Nee, laat maar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
