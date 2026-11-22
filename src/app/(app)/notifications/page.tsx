import type { Metadata } from "next";
import { NotificationList } from "@/components/push/NotificationList";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meldingen" };

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-extrabold">Meldingen 🔔</h1>
      <NotificationList notifications={notifications ?? []} userId={profile.id} />
    </div>
  );
}
