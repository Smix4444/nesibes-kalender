"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/appointments";
import type { Database } from "@/lib/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];

/** Controleert dat de aanroeper echt admin is, los van de RPC-checks. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}

export async function setRole(userId: string, role: AppRole): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adjustCoins(
  userId: string,
  amount: number,
  note?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_adjust_coins", {
    p_user: userId,
    p_amount: amount,
    p_note: note ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/wallet");
  return { ok: true };
}

/** Verwijdert het auth-account; profiel en data volgen via cascade. */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Alleen Rayan mag dit 🛡️" };
  if (admin.id === userId) return { ok: false, error: "Jezelf verwijderen, echt? 😄" };

  const service = createAdminClient();
  const { data: target } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (target?.role === "owner") return { ok: false, error: "Nesibe blijft 👑" };

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

// ------------------------------------------------------------- groepen ----

export async function createGroup(name: string, emoji: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").insert({ name, emoji });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleGroupMember(
  groupId: string,
  userId: string,
  member: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = member
    ? await supabase.from("group_members").insert({ group_id: groupId, user_id: userId })
    : await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// --------------------------------------------------------- instellingen ---

export async function updateSettings(values: {
  monthly_coins: number;
  coin_cap: number;
  min_notice_minutes: number;
  auction_scope: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update(values).eq("id", 1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/** De uitnodigingscode staat in private.config, dus via de service-role. */
export async function updateInviteCode(code: string): Promise<ActionResult> {
  // Met de sessie van de gebruiker, zodat de RPC zelf kan controleren of je
  // admin bent (met de service-role zou auth.uid() leeg zijn).
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_invite_code", { p_code: code });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
