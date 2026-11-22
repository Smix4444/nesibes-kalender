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
