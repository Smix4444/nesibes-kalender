import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { NewAppointmentWizard } from "@/components/appointment/NewAppointmentWizard";
import { requireProfile } from "@/lib/auth";
import { getAvailabilityRules, getBalance, getBusySlots, getGroups, getProfiles } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { dayKey, dayRange, nextDays } from "@/lib/dates";
import { DAY_STRIP_DAYS } from "@/lib/config";
import type { AppointmentCategory } from "@/lib/categories";

export const metadata: Metadata = { title: "Nieuwe afspraak" };

export default async function NewPage({ searchParams }: PageProps<"/new">) {
  const profile = await requireProfile();
  // Nesibe plant via haar eigen planning, niet via een aanvraag aan zichzelf.
  if (profile.role === "owner") redirect("/planning");

  const params = await searchParams;
  const days = nextDays(DAY_STRIP_DAYS);
  const from = dayRange(days[0]).from;
  const to = dayRange(days[days.length - 1]).to;

  const supabase = await createClient();
  const [rules, busy, balance, people, groups] = await Promise.all([
    getAvailabilityRules(),
    getBusySlots(from, to),
    getBalance(profile.id),
    getProfiles(),
    getGroups(),
  ]);

  // Openstaande aanvragen per dag: waarschuwt dat het een veiling wordt.
  const { data: open } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("type", "solo")
    .in("status", ["pending", "auction"])
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString());

  const demand: Record<string, number> = {};
  for (const row of open ?? []) {
    if (!row.starts_at) continue;
    const key = dayKey(row.starts_at);
    demand[key] = (demand[key] ?? 0) + 1;
  }

  // Voorvullen vanuit het ideeënbord of een "vrij vandaag"-oproep.
  const prefillDay = typeof params.day === "string" ? params.day : undefined;
  let prefill = {
    day: prefillDay && days.includes(prefillDay) ? prefillDay : undefined,
    title: typeof params.title === "string" ? params.title : undefined,
    category: typeof params.category === "string" ? (params.category as AppointmentCategory) : undefined,
    ideaId: typeof params.idea === "string" ? params.idea : undefined,
  };

  if (params.prefill === "free_today" && typeof params.id === "string") {
    const { data: ft } = await supabase
      .from("free_today")
      .select("day")
      .eq("id", params.id)
      .maybeSingle();
    if (ft) prefill = { ...prefill, day: ft.day };
  }

  return (
    <NewAppointmentWizard
      role={profile.role}
      balance={balance}
      days={days}
      rules={rules}
      busy={busy}
      demand={demand}
      people={people.filter((p) => p.id !== profile.id && p.role !== "owner")}
      groups={groups}
      prefill={prefill}
    />
  );
}
