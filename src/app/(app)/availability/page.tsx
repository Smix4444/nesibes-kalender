import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AvailabilityEditor } from "@/components/agenda/AvailabilityEditor";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beschikbaarheid" };

export default async function AvailabilityPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner" && profile.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .order("weekday")
    .order("start_time");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Wanneer ben je vrij? 🟢</h1>
        <p className="text-sm text-muted-foreground">
          Vrienden kunnen alleen binnen deze uren iets aanvragen. Blokken uit je
          planning maken je automatisch bezet.
        </p>
      </header>

      <AvailabilityEditor rules={rules ?? []} />
    </div>
  );
}
