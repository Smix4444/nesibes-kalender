import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Hoi! 👋</h1>
        <p className="text-sm text-muted-foreground">
          Welkom bij {APP_NAME}. Hier vraag je Nesibe&apos;s tijd aan.
        </p>
      </section>

      <Card className="overflow-hidden border-0 bg-linear-to-br from-cig-2 to-cig text-white">
        <CardContent className="space-y-3 py-6">
          <p className="font-heading text-lg font-extrabold">Zin om af te spreken? ☕</p>
          <p className="text-sm text-white/85">
            Kies een moment waarop Nesibe vrij is en stuur je aanvraag.
          </p>
          <Button
            render={<Link href="/new" />}
            variant="secondary"
            className="h-11 w-full font-bold"
          >
            Afspraak aanvragen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-5">
          <p className="font-heading font-bold">Nog even dit 📲</p>
          <p className="text-sm text-muted-foreground">
            Zet {APP_NAME} op je beginscherm, dan krijg je een seintje zodra
            Nesibe antwoordt.
          </p>
          <Button render={<Link href="/install" />} variant="outline" className="h-11 w-full">
            Uitleg installeren
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
