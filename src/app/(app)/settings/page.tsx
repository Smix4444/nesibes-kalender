import type { Metadata } from "next";
import { logout } from "@/app/(auth)/actions";
import { NotificationPrefs } from "@/components/push/NotificationPrefs";
import { EnablePushButton } from "@/components/push/EnablePushButton";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { CalendarLink } from "@/components/settings/CalendarLink";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Instellingen" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: calendar } = await supabase
    .from("calendar_tokens")
    .select("token")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-extrabold">Instellingen ⚙️</h1>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Meldingen</h2>
        <EnablePushButton />
        <NotificationPrefs prefs={profile.notif_prefs} />
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Weergave</h2>
        <ThemeToggle />
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-bold">Agenda</h2>

        {profile.role === "owner" ? (
          <Card>
            <CardContent className="space-y-3 py-4">
              <div>
                <p className="font-heading font-bold">📥 Je school- of werkagenda</p>
                <p className="text-sm text-muted-foreground">
                  Koppel je Apple- of Google-agenda, dan worden je lesuren automatisch
                  blokken en kan niemand op die momenten iets aanvragen.
                </p>
              </div>
              <Button
                nativeButton={false}
                render={<Link href="/planning" />}
                variant="outline"
                className="h-11 w-full"
              >
                Agenda koppelen
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Hieronder staat de omgekeerde richting: je NesiPlan-afspraken in je eigen agenda.
        </p>
        {calendar ? (
          <CalendarLink token={calendar.token} />
        ) : (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Nog geen agenda-link gevonden.
            </CardContent>
          </Card>
        )}
      </section>

      <form action={logout}>
        <Button type="submit" variant="outline" className="h-11 w-full">
          Uitloggen
        </Button>
      </form>
    </div>
  );
}
