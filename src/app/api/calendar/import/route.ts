import { NextResponse } from "next/server";
import { syncCalendarFeeds } from "@/lib/calendar-import";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Wordt elke zes uur door de database aangeroepen (pg_cron + pg_net) om de
 * gekoppelde agenda's opnieuw in te lezen. Nesibe kan hem ook zelf triggeren.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const fromCron = Boolean(secret) && request.headers.get("x-dispatch-secret") === secret;

  if (!fromCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "owner") {
      return NextResponse.json({ error: "Alleen Nesibe kan dit" }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true, results: await syncCalendarFeeds() });
}
