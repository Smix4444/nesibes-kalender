"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

/** Inloggen met gebruikersnaam of e-mailadres. */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";

  if (!identifier || !password) return { error: "Vul je gegevens in" };

  const supabase = await createClient();
  let email = identifier;

  if (!identifier.includes("@")) {
    const { data } = await supabase.rpc("username_to_email", { p_username: identifier });
    if (!data) return { error: "Die gebruikersnaam kennen we niet 🤔" };
    email = data;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wachtwoord of gebruikersnaam klopt niet" };

  redirect(next.startsWith("/") ? next : "/");
}

/** Registreren met uitnodigingscode. */
export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get("invite_code") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const emoji = String(formData.get("emoji") ?? "🙂");

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Gebruikersnaam: 3-20 tekens, enkel a-z, 0-9 en _" };
  }
  if (!displayName) return { error: "Hoe mogen we je noemen?" };
  if (password.length < 8) return { error: "Wachtwoord moet minstens 8 tekens zijn" };

  const supabase = await createClient();

  const { data: codeOk } = await supabase.rpc("check_invite_code", { p_code: code });
  if (!codeOk) return { error: "Die uitnodigingscode klopt niet 🤫" };

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) return { error: "Die gebruikersnaam is al bezet" };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: displayName } },
  });
  if (error) {
    return { error: error.message.includes("already") ? "Dat e-mailadres bestaat al" : error.message };
  }

  // Emoji staat niet in de trigger: meteen na het aanmaken bijwerken.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ emoji }).eq("id", user.id);

  redirect("/install");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
