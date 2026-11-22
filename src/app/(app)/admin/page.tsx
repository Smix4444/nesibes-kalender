import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGroups, getProfiles } from "@/lib/data";

export const metadata: Metadata = { title: "Beheer" };

export default async function AdminPage() {
  const profile = await requireProfile();
  // Nesibe mag meekijken, wijzigen doet alleen Rayan (afgedwongen in de RPC's).
  if (profile.role !== "admin" && profile.role !== "owner") redirect("/");

  const supabase = await createClient();
  const [people, groups, { data: balances }, { data: settings }] = await Promise.all([
    getProfiles(),
    getGroups(),
    supabase.from("coin_balances").select("user_id, balance"),
    supabase.from("app_settings").select("*").maybeSingle(),
  ]);

  const balanceByUser = Object.fromEntries(
    (balances ?? []).map((b) => [b.user_id, b.balance ?? 0]),
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Beheer 🛡️</h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "owner"
            ? "Jij en Rayan kunnen rollen, groepen en instellingen wijzigen."
            : "Rollen, munten, groepen en instellingen."}
        </p>
      </header>

      <AdminPanel
        people={people}
        groups={groups}
        balances={balanceByUser}
        settings={settings}
        isAdmin={profile.role === "admin"}
        myId={profile.id}
      />
    </div>
  );
}
