import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWebPush } from "@/lib/push";

export const runtime = "nodejs";

/**
 * Wordt door de database (pg_net-trigger op notifications) aangeroepen zodra
 * er een melding bijkomt, en stuurt die als web-push naar alle toestellen van
 * de ontvanger.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || request.headers.get("x-dispatch-secret") !== secret) {
    return NextResponse.json({ error: "Nope" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const notificationId = body?.notification_id as string | undefined;
  if (!notificationId) return NextResponse.json({ error: "Geen id" }, { status: 400 });

  const admin = createAdminClient();

  const { data: notification } = await admin
    .from("notifications")
    .select("id, user_id, type, title, body, url")
    .eq("id", notificationId)
    .maybeSingle();
  if (!notification) return NextResponse.json({ error: "Onbekende melding" }, { status: 404 });

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id);

  if (!subscriptions?.length) return NextResponse.json({ ok: true, sent: 0 });

  const webpush = getWebPush();
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.url,
    tag: notification.type,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  );

  // Verlopen toestellen opruimen, anders blijven we er eeuwig naar duwen.
  const dead: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const status = (result.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) dead.push(subscriptions[index].id);
    }
  });
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.status === "fulfilled").length,
    removed: dead.length,
  });
}
