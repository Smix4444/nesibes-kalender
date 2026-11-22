import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PlanningBoard } from "@/components/agenda/PlanningBoard";
import { requireProfile } from "@/lib/auth";
import { getOwnerItems } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Mijn planning" };

export default async function PlanningPage() {
  const profile = await requireProfile();
  // owner_items is privé: zelfs Rayan ziet de inhoud niet.
  if (profile.role !== "owner") redirect("/");

  const today = dayKey(new Date());
  const supabase = await createClient();
  const [{ blocks, tasks }, { data: feeds }] = await Promise.all([
    getOwnerItems(today),
    supabase.from("calendar_feeds").select("*").order("created_at"),
  ]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Mijn planning 🗒️</h1>
        <p className="text-sm text-muted-foreground">
          Alleen jij ziet dit. Anderen zien enkel &ldquo;bezet&rdquo;.
        </p>
      </header>

      <PlanningBoard blocks={blocks} tasks={tasks} today={today} feeds={feeds ?? []} />
    </div>
  );
}
