import type { Metadata } from "next";
import { Avatar } from "@/components/people/Avatar";
import { UserName } from "@/components/people/UserName";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COIN_EMOJI, COIN_NAME_PLURAL } from "@/lib/config";
import { fmtDateTime } from "@/lib/dates";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Portemonnee" };

const REASONS: Record<Database["public"]["Enums"]["coin_reason"], string> = {
  welcome: "Welkomstcadeau",
  monthly_grant: "Maandelijkse çiğköftes",
  priority_request: "Priority-aanvraag",
  priority_refund: "Priority terugbetaald",
  bid_hold: "Bod vastgehouden",
  bid_refund: "Bod terugbetaald",
  admin_adjust: "Bijgesteld door de admin",
};

export default async function WalletPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: balance }, { data: ledger }, { data: board }, { data: settings }] =
    await Promise.all([
      supabase.from("coin_balances").select("balance").eq("user_id", profile.id).maybeSingle(),
      supabase
        .from("coin_ledger")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("coin_balances")
        .select("user_id, balance, profiles(id, display_name, emoji, color, avatar_url, role)")
        .order("balance", { ascending: false })
        .limit(10)
        .returns<
          {
            user_id: string;
            balance: number;
            profiles: {
              id: string;
              display_name: string;
              emoji: string;
              color: string;
              avatar_url: string | null;
              role: Database["public"]["Enums"]["app_role"];
            };
          }[]
        >(),
      supabase.from("app_settings").select("monthly_coins, coin_cap").maybeSingle(),
    ]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center gap-1 pt-4 text-center">
        <span className="text-5xl" aria-hidden>
          {COIN_EMOJI}
        </span>
        <p className="font-heading text-5xl font-extrabold tabular-nums">{balance?.balance ?? 0}</p>
        <p className="text-sm text-muted-foreground">{COIN_NAME_PLURAL} op zak</p>
      </section>

      <Card className="bg-cig/5">
        <CardContent className="py-4 text-sm">
          Je krijgt er <strong>{settings?.monthly_coins ?? 2}</strong> per maand (max.{" "}
          <strong>{settings?.coin_cap ?? 6}</strong>). Priority kost er 1, bieden mag zoveel je wil.
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Scorebord 🏆</h2>
        <ul className="space-y-1">
          {(board ?? [])
            .filter((row) => row.profiles && row.profiles.role !== "owner")
            .map((row, index) => (
              <li
                key={row.user_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <span className="w-5 text-sm font-bold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <Avatar profile={row.profiles} size={30} />
                <UserName profile={row.profiles} className="flex-1 text-sm font-medium" />
                <span className="text-sm font-bold text-cig tabular-nums">
                  {COIN_EMOJI} {row.balance}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Historiek</h2>
        {(ledger ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nog niets uitgegeven 🌶️
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-3">
            {(ledger ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{REASONS[entry.reason]}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(entry.created_at)}</p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    entry.amount > 0 ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
