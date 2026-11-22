import "server-only";

import { createClient } from "@/lib/supabase/server";
import { dayKey, dayRange, nextDays } from "@/lib/dates";
import type { AvailabilityRule, BusySlot } from "@/lib/availability";
import type { Tables } from "@/lib/database.types";
import type { AppRole } from "@/lib/config";

export type Appointment = Tables<"appointments">;
export type Profile = Tables<"profiles">;

export type ParticipantRow = {
  user_id: string;
  rsvp: Tables<"appointment_participants">["rsvp"];
  checked_in_at: string | null;
  profiles: Pick<Profile, "id" | "display_name" | "emoji" | "color" | "avatar_url" | "role">;
};

export type AppointmentWithPeople = Appointment & {
  creator: Pick<Profile, "id" | "display_name" | "emoji" | "color" | "avatar_url" | "role">;
  participants: ParticipantRow[];
};

/** De wekelijkse vrije vensters van Nesibe. */
export async function getAvailabilityRules(): Promise<AvailabilityRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time")
    .order("weekday")
    .order("start_time");
  return data ?? [];
}

/** Bezette tijdvakken, zonder titels of namen (RPC is security definer). */
export async function getBusySlots(from: Date, to: Date): Promise<BusySlot[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_busy_slots", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  return data ?? [];
}

/** Vrij/bezet voor de komende dagen, voor de strip op Home en in de wizard. */
export async function getDayStrip(days = 14) {
  const keys = nextDays(days);
  const from = dayRange(keys[0]).from;
  const to = dayRange(keys[keys.length - 1]).to;

  const [rules, busy] = await Promise.all([getAvailabilityRules(), getBusySlots(from, to)]);
  return { days: keys, rules, busy };
}

/** Afspraken waar ik bij hoor, met deelnemers. */
export async function getMyAppointments(limit = 20): Promise<AppointmentWithPeople[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      `*,
       creator:profiles!appointments_created_by_fkey(id, display_name, emoji, color, avatar_url, role),
       participants:appointment_participants(user_id, rsvp, checked_in_at,
         profiles(id, display_name, emoji, color, avatar_url, role))`,
    )
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(limit)
    .returns<AppointmentWithPeople[]>();
  return data ?? [];
}

/** Eén afspraak met alles erbij. */
export async function getAppointment(id: string): Promise<AppointmentWithPeople | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      `*,
       creator:profiles!appointments_created_by_fkey(id, display_name, emoji, color, avatar_url, role),
       participants:appointment_participants(user_id, rsvp, checked_in_at,
         profiles(id, display_name, emoji, color, avatar_url, role))`,
    )
    .eq("id", id)
    .maybeSingle()
    .returns<AppointmentWithPeople | null>();
  return data ?? null;
}

export type InboxItem = AppointmentWithPeople & { role: AppRole };

/** Openstaande aanvragen voor Nesibe, al gesorteerd op prioriteit. */
export async function getInbox(): Promise<InboxItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      `*,
       creator:profiles!appointments_created_by_fkey(id, display_name, emoji, color, avatar_url, role),
       participants:appointment_participants(user_id, rsvp, checked_in_at,
         profiles(id, display_name, emoji, color, avatar_url, role))`,
    )
    .in("status", ["pending", "countered", "auction"])
    .order("created_at", { ascending: true })
    .returns<AppointmentWithPeople[]>();

  const { sortRequests } = await import("@/lib/priority");
  return sortRequests((data ?? []).map((a) => ({ ...a, role: a.creator.role })));
}

/** Mijn saldo aan çiğköftes. */
export async function getBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coin_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}

/** Lopende "Nesibe is vrij vandaag"-oproep, als die er is. */
export async function getActiveFreeToday(): Promise<Tables<"free_today"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("free_today")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Nesibe's eigen taken en blokken voor vandaag. */
export async function getOwnerItems(day?: string) {
  const supabase = await createClient();
  const key = day ?? dayKey(new Date());
  const { from, to } = dayRange(key);

  const [blocks, tasks] = await Promise.all([
    supabase
      .from("owner_items")
      .select("*")
      .eq("kind", "block")
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .order("starts_at"),
    supabase
      .from("owner_items")
      .select("*")
      .eq("kind", "task")
      .order("done")
      .order("due_date", { nullsFirst: false }),
  ]);

  return { blocks: blocks.data ?? [], tasks: tasks.data ?? [] };
}

/** Alle profielen, voor de people picker en het beheer. */
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("display_name");
  return data ?? [];
}

export async function getGroups() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*, group_members(user_id)")
    .order("name")
    .returns<(Tables<"groups"> & { group_members: { user_id: string }[] })[]>();
  return data ?? [];
}
