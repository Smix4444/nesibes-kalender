import { createEvents, type EventAttributes } from "ics";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_NAME } from "@/lib/config";
import { categoryMeta } from "@/lib/categories";

export const runtime = "nodejs";

/** ics verwacht [jaar, maand, dag, uur, minuut] in UTC. */
function toUtcArray(iso: string): [number, number, number, number, number] {
  const d = new Date(iso);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

/**
 * Persoonlijke agenda-feed. Het token staat in calendar_tokens en is de enige
 * sleutel, dus behandelen we het als een geheim (geen caching, geen indexering).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("calendar_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!row) return new Response("Onbekende agenda-link", { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", row.user_id)
    .maybeSingle();

  const { data: participations } = await admin
    .from("appointment_participants")
    .select("appointment_id")
    .eq("user_id", row.user_id);

  const ids = (participations ?? []).map((p) => p.appointment_id);

  const { data: appointments } = ids.length
    ? await admin
        .from("appointments")
        .select("id, title, category, description, starts_at, ends_at, location_name, location_address")
        .in("id", ids)
        .eq("status", "accepted")
        .not("starts_at", "is", null)
    : { data: [] };

  const events: EventAttributes[] = (appointments ?? []).map((appt) => ({
    uid: `${appt.id}@nesiplan`,
    title: `${categoryMeta(appt.category).emoji} ${appt.title}`,
    start: toUtcArray(appt.starts_at!),
    startInputType: "utc",
    end: toUtcArray(appt.ends_at ?? appt.starts_at!),
    endInputType: "utc",
    location: appt.location_address ?? appt.location_name ?? undefined,
    description: [appt.description, `Open in ${APP_NAME}: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/appointments/${appt.id}`]
      .filter(Boolean)
      .join("\n\n"),
    productId: APP_NAME,
    calName: APP_NAME,
  }));

  // Nesibe krijgt haar eigen blokken erbij.
  if (profile?.role === "owner") {
    const { data: blocks } = await admin
      .from("owner_items")
      .select("id, title, notes, starts_at, ends_at")
      .eq("kind", "block")
      .not("starts_at", "is", null);

    for (const block of blocks ?? []) {
      events.push({
        uid: `${block.id}@nesiplan-block`,
        title: `⛔ ${block.title}`,
        start: toUtcArray(block.starts_at!),
        startInputType: "utc",
        end: toUtcArray(block.ends_at!),
        endInputType: "utc",
        description: block.notes ?? undefined,
        productId: APP_NAME,
        calName: APP_NAME,
      });
    }
  }

  const { error, value } = createEvents(events);
  if (error) return new Response("Kon de agenda niet maken", { status: 500 });

  return new Response(value ?? "", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${APP_NAME.toLowerCase()}.ics"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
