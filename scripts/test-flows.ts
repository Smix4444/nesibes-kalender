/**
 * End-to-end flows tegen de ECHTE database (PLAN sectie 16).
 *
 *   npm run test:flows
 *
 * Maakt twee tijdelijke testmembers aan, doorloopt de scenario's met hun eigen
 * sessie en ruimt daarna alles weer op. Draai dit op een database die je mag
 * vervuilen — het raakt de echte accounts niet aan, maar maakt wel afspraken.
 */
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Zet NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Client = SupabaseClient<Database>;

const TEST_USERS = [
  { username: "test_a", email: "test_a@nesiplan.test", password: "TestFlow2026!a" },
  { username: "test_b", email: "test_b@nesiplan.test", password: "TestFlow2026!b" },
];

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Een los ingelogde client per testgebruiker. */
async function signIn(email: string, password: string): Promise<Client> {
  const client = createClient<Database>(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Inloggen mislukt voor ${email}: ${error.message}`);
  return client;
}

async function ensureTestUser(user: (typeof TEST_USERS)[number]): Promise<string> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", user.username)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { username: user.username, display_name: user.username },
  });
  if (error) throw error;
  return data.user.id;
}

/** Een tijdstip binnen een vrij venster van Nesibe, N dagen vooruit. */
async function freeSlot(daysAhead: number): Promise<{ start: string; end: string } | null> {
  const { data: rules } = await admin.from("availability_rules").select("*");
  if (!rules?.length) return null;

  for (let offset = daysAhead; offset < daysAhead + 14; offset++) {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    const weekday = (day.getDay() + 6) % 7;
    const rule = rules.find((r) => r.weekday === weekday);
    if (!rule) continue;

    const [h, m] = rule.start_time.split(":").map(Number);
    const start = new Date(day);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const busy = await admin.rpc("get_busy_slots", {
      p_from: start.toISOString(),
      p_to: end.toISOString(),
    });
    if ((busy.data ?? []).length === 0) {
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }
  return null;
}

const balanceOf = async (client: Client, userId: string) => {
  const { data } = await client.from("coin_balances").select("balance").eq("user_id", userId).maybeSingle();
  return data?.balance ?? 0;
};

async function main() {
  console.log("🧪 NesiPlan flow-tests\n");

  const { data: owner } = await admin.from("profiles").select("id").eq("role", "owner").maybeSingle();
  if (!owner) {
    console.error("Geen owner gevonden. Draai eerst: npm run seed");
    process.exit(1);
  }

  const ids = [await ensureTestUser(TEST_USERS[0]), await ensureTestUser(TEST_USERS[1])];
  const [a, b] = await Promise.all([
    signIn(TEST_USERS[0].email, TEST_USERS[0].password),
    signIn(TEST_USERS[1].email, TEST_USERS[1].password),
  ]);

  // Nesibe heeft geen wachtwoord dat we hier kennen: haar acties draaien via
  // de service-role, die RLS omzeilt maar wel dezelfde RPC's aanroept.
  const createdAppointments: string[] = [];

  try {
    // --- 1. aanvraag -> Nesibe accepteert -------------------------------
    console.log("1. Aanvraag accepteren");
    const slot1 = await freeSlot(2);
    if (!slot1) throw new Error("Geen vrij moment gevonden; staat er beschikbaarheid in?");

    const { data: id1, error: err1 } = await a.rpc("request_appointment", {
      p_title: "Testkoffie",
      p_category: "koffie",
      p_description: "",
      p_starts_at: slot1.start,
      p_ends_at: slot1.end,
    });
    check("test_a kan aanvragen", !err1 && Boolean(id1), err1?.message);
    if (id1) createdAppointments.push(id1);

    const { data: notified } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", owner.id)
      .eq("type", "request_new")
      .order("created_at", { ascending: false })
      .limit(1);
    check("Nesibe kreeg een melding", (notified ?? []).length > 0);

    // --- 5. RLS: andermans afspraak is onzichtbaar ----------------------
    const { data: peek } = await b.from("appointments").select("id").eq("id", id1!);
    check("test_b ziet de afspraak van test_a niet (RLS)", (peek ?? []).length === 0);

    // --- 6. RLS: eigen rol wijzigen mag niet ----------------------------
    const { error: roleError } = await a.from("profiles").update({ role: "admin" }).eq("id", ids[0]);
    check("test_a kan zichzelf geen admin maken", Boolean(roleError), "update werd toegestaan");

    // --- 7. buiten de vrije uren aanvragen ------------------------------
    const night = new Date();
    night.setDate(night.getDate() + 3);
    night.setHours(4, 0, 0, 0);
    const { error: nightError } = await a.rpc("request_appointment", {
      p_title: "Midden in de nacht",
      p_category: "anders",
      p_description: "",
      p_starts_at: night.toISOString(),
      p_ends_at: new Date(night.getTime() + 3600_000).toISOString(),
    });
    check("buiten de vrije uren wordt geweigerd", Boolean(nightError));

    // --- 2. priority kost en krijgt terug -------------------------------
    console.log("\n2. Priority-munt");
    const before = await balanceOf(a, ids[0]);
    const slot2 = await freeSlot(5);
    const { data: id2, error: err2 } = await a.rpc("request_appointment", {
      p_title: "Priority test",
      p_category: "eten",
      p_description: "",
      p_starts_at: slot2!.start,
      p_ends_at: slot2!.end,
      p_is_priority: true,
    });
    if (id2) createdAppointments.push(id2);

    const afterSpend = await balanceOf(a, ids[0]);
    check("priority kost 1 çiğköfte", !err2 && afterSpend === before - 1, `${before} -> ${afterSpend}`);

    await admin.rpc("respond_appointment", { p_id: id2!, p_action: "decline", p_reason: "Test" });
    const afterRefund = await balanceOf(a, ids[0]);
    check("weigeren betaalt de munt terug", afterRefund === before, `${afterSpend} -> ${afterRefund}`);

    // --- 3. veiling tussen test_a en test_b -----------------------------
    console.log("\n3. Veiling");
    const slot3 = await freeSlot(8);
    const { data: idA } = await a.rpc("request_appointment", {
      p_title: "Veiling A",
      p_category: "koffie",
      p_description: "",
      p_starts_at: slot3!.start,
      p_ends_at: slot3!.end,
    });
    const { data: idB } = await b.rpc("request_appointment", {
      p_title: "Veiling B",
      p_category: "koffie",
      p_description: "",
      p_starts_at: slot3!.start,
      p_ends_at: slot3!.end,
    });
    if (idA) createdAppointments.push(idA);
    if (idB) createdAppointments.push(idB);

    const { data: auctionAppt } = await admin
      .from("appointments")
      .select("auction_id, status")
      .eq("id", idA!)
      .maybeSingle();
    check("tweede aanvraag start een veiling", auctionAppt?.status === "auction");

    const auctionId = auctionAppt?.auction_id;
    if (auctionId) {
      const { error: bidError } = await a.rpc("place_bid", { p_auction: auctionId, p_amount: 2 });
      await b.rpc("place_bid", { p_auction: auctionId, p_amount: 2 });
      check("bieden lukt", !bidError, bidError?.message);

      const balanceDuringAuction = await balanceOf(a, ids[0]);
      check("bod houdt munten vast", balanceDuringAuction === before - 2, `saldo ${balanceDuringAuction}`);

      // Gelijk bod, gelijke rol -> oudste bod staat bovenaan.
      const { data: bids } = await admin
        .from("bids")
        .select("user_id, amount, updated_at")
        .eq("auction_id", auctionId)
        .order("updated_at");
      check("bij gelijk bod staat het oudste bod bovenaan", bids?.[0]?.user_id === ids[0]);

      // Nesibe kiest test_b (het lagere/latere bod mag ook).
      await admin.rpc("close_auction", {
        p_auction: auctionId,
        p_winner: idB!,
        p_also_accept: [],
      });

      const refunded = await balanceOf(a, ids[0]);
      const winnerBalance = await balanceOf(b, ids[1]);
      check("verliezer krijgt zijn bod terug", refunded === before, `saldo ${refunded}`);
      check("winnaar betaalt zijn bod", winnerBalance < before, `saldo ${winnerBalance}`);
    }

    // --- 4. Dragos wint een gelijk bod ----------------------------------
    console.log("\n4. Tie-break op rol");
    const { data: dragos } = await admin.from("profiles").select("id, role").eq("username", "dragos").maybeSingle();
    if (dragos?.role === "vip") {
      const { sortBids } = await import("../src/lib/priority");
      const winner = sortBids([
        { amount: 1, role: "member", updated_at: "2026-01-01T10:00:00Z", is_priority: false },
        { amount: 1, role: "vip", updated_at: "2026-01-01T11:00:00Z", is_priority: false },
      ])[0];
      check("Dragos wint een gelijk bod van een member", winner.role === "vip");
    } else {
      console.log("  ⏭️  Dragos niet gevonden, overgeslagen (npm run seed)");
    }

    // --- 8. groepsactiviteit is alleen zichtbaar voor getagden ----------
    console.log("\n5. Groepsactiviteit");
    const slot4 = await freeSlot(11);
    const { data: groupId, error: groupError } = await a.rpc("create_group_activity", {
      p_title: "Testgroep",
      p_category: "uitgaan",
      p_description: "",
      p_starts_at: slot4!.start,
      p_ends_at: slot4!.end,
      p_user_ids: [],
      p_group_ids: [],
    });
    if (groupId) createdAppointments.push(groupId);
    check("groepsactiviteit aanmaken lukt", !groupError, groupError?.message);

    const { data: seenByA } = await a.from("appointments").select("id").eq("id", groupId!);
    const { data: seenByB } = await b.from("appointments").select("id").eq("id", groupId!);
    check("de maker ziet de activiteit", (seenByA ?? []).length === 1);
    check("een niet-getagde ziet ze niet", (seenByB ?? []).length === 0);
  } finally {
    // --- opruimen -------------------------------------------------------
    console.log("\n🧹 Opruimen");
    if (createdAppointments.length) {
      await admin.from("appointments").delete().in("id", createdAppointments);
    }
    for (const id of ids) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    console.log("  testgebruikers en testafspraken verwijderd");
  }

  console.log(`\n${passed} geslaagd, ${failed} gefaald`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("\n💥", error);
  process.exit(1);
});
