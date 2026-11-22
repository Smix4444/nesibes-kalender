"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Abonneerbare .ics-link. Google en Apple verversen zo'n agenda maar om de
 * paar uur — in de app zelf zie je wijzigingen meteen.
 */
export function CalendarLink({ token }: { token: string }) {
  const [url] = useState(() =>
    typeof window === "undefined" ? "" : `${window.location.origin}/api/calendar/${token}`,
  );

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <p className="text-sm text-muted-foreground">
          Abonneer je agenda op deze link, dan staan je afspraken ook in Google
          Agenda of op je iPhone.
        </p>

        <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">{url}</code>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast.success("Link gekopieerd 📋");
            }}
          >
            <Copy className="size-4" /> Kopieer
          </Button>
          <Button
            nativeButton={false} render={<a href={url.replace(/^https?:/, "webcal:")} />}
            className="h-11"
          >
            Abonneren
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Google Agenda: &ldquo;Andere agenda&rsquo;s&rdquo; → &ldquo;Via URL&rdquo;. Let op: Google
          ververst maar om de paar uur.
        </p>
      </CardContent>
    </Card>
  );
}
