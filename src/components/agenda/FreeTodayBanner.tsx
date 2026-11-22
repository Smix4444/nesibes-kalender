import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";

const hhmm = (t: string) => t.slice(0, 5);

/** Opvallende banner op Home zolang Nesibe's oproep loopt. */
export function FreeTodayBanner({ freeToday }: { freeToday: Tables<"free_today"> }) {
  return (
    <Card className="overflow-hidden border-0 bg-linear-to-br from-success to-cig-2 text-white">
      <CardContent className="space-y-2 py-4">
        <p className="font-heading text-lg font-extrabold">
          ✨ Nesibe is vrij van {hhmm(freeToday.from_time)} tot {hhmm(freeToday.to_time)}!
        </p>
        {freeToday.message ? (
          <p className="text-sm text-white/90">&ldquo;{freeToday.message}&rdquo;</p>
        ) : null}
        <Button
          render={<Link href={`/new?prefill=free_today&id=${freeToday.id}`} />}
          variant="secondary"
          className="h-11 w-full font-bold"
        >
          Ik ben in! 🙋
        </Button>
      </CardContent>
    </Card>
  );
}
