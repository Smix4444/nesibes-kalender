import { logout } from "@/app/(auth)/actions";
import { UserName } from "@/components/people/UserName";
import { Avatar } from "@/components/people/Avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { COIN_EMOJI } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: balance } = await supabase
    .from("coin_balances")
    .select("balance")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center gap-3 pt-2 text-center">
        <Avatar profile={profile} size={80} />
        <div>
          <UserName profile={profile} className="font-heading text-xl font-extrabold" />
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <p className="rounded-full bg-cig/10 px-3 py-1 text-sm font-bold text-cig">
          {COIN_EMOJI} {balance?.balance ?? 0} çiğköftes
        </p>
      </section>

      <Card>
        <CardContent className="divide-y divide-border py-0">
          <ProfileLink href="/wallet" emoji="🌶️" label="Portemonnee" />
          <ProfileLink href="/badges" emoji="🏅" label="Badges" />
          <ProfileLink href="/settings" emoji="⚙️" label="Instellingen" />
          <ProfileLink href="/install" emoji="📲" label="App installeren" />
        </CardContent>
      </Card>

      <form action={logout}>
        <Button type="submit" variant="outline" className="h-11 w-full">
          Uitloggen
        </Button>
      </form>
    </div>
  );
}

function ProfileLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <a href={href} className="flex min-h-12 items-center gap-3 py-3 text-sm font-medium">
      <span aria-hidden>{emoji}</span>
      {label}
      <span className="ml-auto text-muted-foreground">›</span>
    </a>
  );
}
