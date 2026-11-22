import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Badges" };

export default async function BadgesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: badges }, { data: mine }] = await Promise.all([
    supabase.from("badges").select("*").order("is_role_badge", { ascending: false }).order("code"),
    supabase.from("user_badges").select("badge_code, period, awarded_at").eq("user_id", profile.id),
  ]);

  const earned = new Map((mine ?? []).map((b) => [b.badge_code, b]));

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Badges 🏅</h1>
        <p className="text-sm text-muted-foreground">
          {earned.size} van {badges?.length ?? 0} verzameld.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-2">
        {(badges ?? []).map((badge) => {
          const got = earned.get(badge.code);

          return (
            <li key={badge.code}>
              <Card className={cn("h-full", !got && "opacity-55")}>
                <CardContent className="space-y-1 py-4 text-center">
                  <span className={cn("block text-3xl", !got && "grayscale")} aria-hidden>
                    {badge.emoji}
                  </span>
                  <p className="font-heading text-sm font-extrabold">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {got ? (
                    <p className="text-[11px] font-semibold text-success">
                      ✓ {fmt(got.awarded_at, "d MMM yyyy")}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
