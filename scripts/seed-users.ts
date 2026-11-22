/**
 * Maakt Nesibe (owner), Rayan (admin) en Dragos (vip) aan, geeft ze hun
 * rolbadge en zet een paar voorbeeldideeën klaar.
 *
 *   npm run seed
 *
 * Idempotent: bestaande accounts worden overgeslagen, niet overschreven.
 *
 * De wachtwoorden staan hier op Rayans uitdrukkelijke vraag "voor de
 * leukigheid" in de code — hou de repo dus private. De service-role key komt
 * wel uit .env.local en staat nooit in de code.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Vervang de e-mails door echte adressen als je wachtwoord-reset wil gebruiken.
const users = [
  { username: "nesibe",   display_name: "Nesibe",   email: "nesibe@example.com",   password: "CigkofteQueen2026!", role: "owner",  emoji: "👑", color: "#D7263D" },
  { username: "rayan",    display_name: "Rayan",    email: "rayan@example.com",    password: "DeBF2026!",          role: "admin",  emoji: "💞", color: "#FF5C8A" },
  { username: "dragos",   display_name: "Dragos",   email: "dragos@example.com",   password: "DragosVIP2026!",     role: "vip",    emoji: "⭐", color: "#D4A017" },
  { username: "melissa",  display_name: "Melissa",  email: "melissa@example.com",  password: "Melissa2026!",       role: "member", emoji: "🌸", color: "#C86FC9" },
  { username: "tuana",    display_name: "Tuana",    email: "tuana@example.com",    password: "Tuana2026!",         role: "member", emoji: "🦊", color: "#E4572E" },
  { username: "eray",     display_name: "Eray",     email: "eray@example.com",     password: "Eray2026!",          role: "member", emoji: "😎", color: "#5C7AEA" },
  { username: "deepan",   display_name: "Deepan",   email: "deepan@example.com",   password: "Deepan2026!",        role: "member", emoji: "🔥", color: "#2BB673" },
  { username: "selinofc", display_name: "Selin",    email: "selinofc@example.com", password: "Selin2026!",         role: "member", emoji: "🧋", color: "#9B5DE5" },
] as const;

const roleBadge: Record<string, string | null> = { owner: "owner", admin: "bf", vip: "vip", member: null };

const sampleIdeas = [
  { title: "Kolonel Koffie proberen", category: "koffie", description: "Iedereen zegt dat de flat white daar top is." },
  { title: "Picknick in het park", category: "wandelen", description: "Bij het eerste zonnetje." },
  { title: "Bowlingavond", category: "uitgaan", description: "Verliezer trakteert friet." },
  { title: "Samen blokken in de bib", category: "studeren", description: "Met pauzes voor bubble tea." },
] as const;

async function main() {
  let ownerId: string | undefined;

  for (const u of users) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", u.username)
      .maybeSingle();

    let id = existing?.id;

    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { username: u.username, display_name: u.display_name },
      });
      if (error) throw error;
      id = data.user.id;
      console.log(`   nieuw account aangemaakt voor ${u.display_name}`);
    }

    await admin.from("profiles").update({ role: u.role, emoji: u.emoji, color: u.color }).eq("id", id);

    // Alleen owner/admin/vip hebben een rolbadge.
    const badge = roleBadge[u.role];
    if (badge) {
      const { data: hasBadge } = await admin
        .from("user_badges")
        .select("id")
        .eq("user_id", id)
        .eq("badge_code", badge)
        .is("period", null)
        .maybeSingle();

      if (!hasBadge) {
        await admin.from("user_badges").insert({ user_id: id, badge_code: badge, period: null });
      }
    }

    if (u.role === "owner") ownerId = id;
    console.log(`✅ ${u.display_name} (${u.role}) klaar`);
  }

  // Voorbeeldideeën hebben een bestaande gebruiker nodig, vandaar hier en niet
  // in de seed-migration.
  if (ownerId) {
    const { count } = await admin.from("ideas").select("id", { count: "exact", head: true });
    if (!count) {
      await admin.from("ideas").insert(
        sampleIdeas.map((idea) => ({ ...idea, created_by: ownerId })),
      );
      console.log(`✅ ${sampleIdeas.length} voorbeeldideeën toegevoegd`);
    }
  }

  console.log("\nKlaar. Inloggen kan met de gebruikersnaam (nesibe / rayan / dragos).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
