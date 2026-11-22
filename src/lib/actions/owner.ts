"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { atLocalTime } from "@/lib/dates";
import type { ActionResult } from "@/lib/actions/appointments";

/** RLS laat alleen owner/admin schrijven op availability_rules. */
export async function addAvailabilityRule(
  weekday: number,
  startTime: string,
  endTime: string,
): Promise<ActionResult> {
  if (endTime <= startTime) return { ok: false, error: "Eindtijd moet na de starttijd liggen" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_rules")
    .insert({ weekday, start_time: startTime, end_time: endTime });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/availability");
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAvailabilityRule(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/availability");
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

// -------------------------------------------------- blokken & taken ------
// owner_items valt onder een RLS-policy die alleen Nesibe toelaat.

export async function addBlock(
  title: string,
  day: string,
  from: string,
  to: string,
  notes?: string,
): Promise<ActionResult> {
  if (to <= from) return { ok: false, error: "Eindtijd moet na de starttijd liggen" };

  const supabase = await createClient();
  const { error } = await supabase.from("owner_items").insert({
    kind: "block",
    title,
    notes: notes || null,
    starts_at: atLocalTime(day, from).toISOString(),
    ends_at: atLocalTime(day, to).toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

export async function addTask(title: string, dueDate?: string, notes?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("owner_items").insert({
    kind: "task",
    title,
    notes: notes || null,
    due_date: dueDate || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleTask(id: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("owner_items").update({ done }).eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteOwnerItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("owner_items").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

// ------------------------------------------------- externe agenda's ------

/** Nesibe koppelt een .ics-link (Apple, Google, schoolrooster). */
export async function addCalendarFeed(label: string, url: string): Promise<ActionResult> {
  const trimmed = url.trim();
  if (!/^(https?|webcal):\/\//i.test(trimmed)) {
    return { ok: false, error: "Plak een link die begint met https:// of webcal://" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_feeds")
    .insert({ label: label.trim() || "Mijn agenda", url: trimmed });
  if (error) return { ok: false, error: error.message };

  return syncCalendarFeedsAction();
}

export async function deleteCalendarFeed(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Ook de blokken weghalen die uit deze agenda kwamen.
  const { error } = await supabase.from("calendar_feeds").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("owner_items")
    .delete()
    .eq("source", `ics:${id}`)
    .gte("starts_at", new Date().toISOString());

  revalidatePath("/planning");
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

/** Haalt de gekoppelde agenda's nu meteen opnieuw op. */
export async function syncCalendarFeedsAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "owner") return { ok: false, error: "Alleen Nesibe kan dit" };

  const { syncCalendarFeeds } = await import("@/lib/calendar-import");
  const results = await syncCalendarFeeds();

  revalidatePath("/planning");
  revalidatePath("/agenda");
  revalidatePath("/");

  const failed = results.find((r) => r.error);
  if (failed) return { ok: false, error: `${failed.label}: ${failed.error}` };
  return { ok: true };
}
