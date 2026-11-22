"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Category = Database["public"]["Enums"]["appt_category"];
type Rsvp = Database["public"]["Enums"]["rsvp_status"];

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Foutmeldingen uit de RPC's zijn al Nederlands en grappig bedoeld; die tonen
 * we letterlijk als toast. Alleen onverwachte fouten krijgen een nette tekst.
 */
function fail(error: { message?: string } | null): ActionResult {
  const message = error?.message?.trim();
  if (!message) return { ok: false, error: "Er ging iets mis, probeer het opnieuw" };
  return { ok: false, error: message };
}

function refresh(...paths: string[]) {
  for (const path of ["/", "/agenda", "/inbox", ...paths]) revalidatePath(path);
}

// ------------------------------------------------------------- aanvragen --

export async function requestAppointment(input: {
  title: string;
  category: Category;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  location_name?: string | null;
  location_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_priority?: boolean;
  idea_id?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_appointment", {
    p_title: input.title,
    p_category: input.category,
    p_description: input.description ?? "",
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_location_name: input.location_name ?? undefined,
    p_location_address: input.location_address ?? undefined,
    p_lat: input.lat ?? undefined,
    p_lng: input.lng ?? undefined,
    p_is_priority: input.is_priority ?? false,
    p_idea_id: input.idea_id ?? undefined,
  });

  if (error) return fail(error);
  refresh();
  return { ok: true, id: data ?? undefined };
}

export async function respondAppointment(
  id: string,
  action: "accept" | "decline",
  reason?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_appointment", {
    p_id: id,
    p_action: action,
    p_reason: reason ?? undefined,
  });

  if (error) return fail(error);
  refresh(`/appointments/${id}`);
  return { ok: true };
}

export async function counterPropose(
  id: string,
  starts: string,
  ends: string,
  message?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("counter_propose", {
    p_id: id,
    p_starts: starts,
    p_ends: ends,
    p_message: message ?? undefined,
  });

  if (error) return fail(error);
  refresh(`/appointments/${id}`);
  return { ok: true };
}

export async function respondCounter(
  counterId: string,
  action: "accept" | "reject" | "repropose",
  starts?: string,
  ends?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_counter", {
    p_counter: counterId,
    p_action: action,
    p_starts: starts ?? undefined,
    p_ends: ends ?? undefined,
  });

  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function cancelAppointment(id: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_appointment", {
    p_id: id,
    p_reason: reason ?? undefined,
  });

  if (error) return fail(error);
  refresh(`/appointments/${id}`);
  return { ok: true };
}

// -------------------------------------------------- groepen, rsvp & poll --

export async function createGroupActivity(input: {
  title: string;
  category: Category;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  user_ids?: string[];
  group_ids?: string[];
  poll_options?: { starts_at: string; ends_at: string }[] | null;
  poll_closes_at?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group_activity", {
    p_title: input.title,
    p_category: input.category,
    p_description: input.description ?? "",
    p_starts_at: input.starts_at ?? undefined,
    p_ends_at: input.ends_at ?? undefined,
    p_location_name: input.location_name ?? undefined,
    p_location_address: input.location_address ?? undefined,
    p_lat: input.lat ?? undefined,
    p_lng: input.lng ?? undefined,
    p_user_ids: input.user_ids ?? [],
    p_group_ids: input.group_ids ?? [],
    p_poll_options: input.poll_options?.length ? input.poll_options : undefined,
    p_poll_closes_at: input.poll_closes_at ?? undefined,
  });

  if (error) return fail(error);
  refresh();
  return { ok: true, id: data ?? undefined };
}

export async function setRsvp(id: string, status: Rsvp): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rsvp", { p_id: id, p_status: status });

  if (error) return fail(error);
  refresh(`/appointments/${id}`);
  return { ok: true };
}

export async function votePoll(
  optionId: string,
  vote: Database["public"]["Enums"]["poll_vote_value"],
  appointmentId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("vote_poll", { p_option: optionId, p_vote: vote });

  if (error) return fail(error);
  revalidatePath(`/appointments/${appointmentId}`);
  return { ok: true };
}

export async function finalizePoll(id: string, optionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_poll", { p_id: id, p_option: optionId });

  if (error) return fail(error);
  refresh(`/appointments/${id}`);
  return { ok: true };
}

// ------------------------------------------------------ veiling & munten --

export async function placeBid(
  auctionId: string,
  amount: number,
  sweetener?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("place_bid", {
    p_auction: auctionId,
    p_amount: amount,
    p_sweetener: sweetener ?? undefined,
  });

  if (error) return fail(error);
  refresh(`/auctions/${auctionId}`, "/wallet");
  return { ok: true };
}

export async function closeAuction(
  auctionId: string,
  winnerAppointmentId: string,
  alsoAccept: string[] = [],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_auction", {
    p_auction: auctionId,
    p_winner: winnerAppointmentId,
    p_also_accept: alsoAccept,
  });

  if (error) return fail(error);
  refresh(`/auctions/${auctionId}`, "/wallet");
  return { ok: true };
}

// ------------------------------------------------------- check-in & rest --

export async function checkIn(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in", { p_id: id });

  if (error) return fail(error);
  revalidatePath(`/appointments/${id}`);
  return { ok: true };
}

export async function broadcastFreeToday(
  from: string,
  to: string,
  message?: string,
  groupId?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("broadcast_free_today", {
    p_from: from,
    p_to: to,
    p_message: message ?? undefined,
    p_group: groupId ?? undefined,
  });

  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function requestSeries(input: {
  title: string;
  category: Category;
  freq: Database["public"]["Enums"]["series_freq"];
  first_starts_at: string;
  duration_minutes: number;
  until_date: string;
  location_name?: string | null;
  location_address?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_series", {
    p_title: input.title,
    p_category: input.category,
    p_freq: input.freq,
    p_first_starts_at: input.first_starts_at,
    p_duration_minutes: input.duration_minutes,
    p_until_date: input.until_date,
    p_location_name: input.location_name ?? undefined,
    p_location_address: input.location_address ?? undefined,
    p_lat: input.lat ?? undefined,
    p_lng: input.lng ?? undefined,
  });

  if (error) return fail(error);
  refresh();
  return { ok: true, id: data ?? undefined };
}

export async function respondSeries(seriesId: string, accept: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_series", {
    p_series: seriesId,
    p_accept: accept,
  });

  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function endSeries(seriesId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_series", { p_series: seriesId });

  if (error) return fail(error);
  refresh();
  return { ok: true };
}
