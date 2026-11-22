"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCalendarFeed,
  deleteCalendarFeed,
  syncCalendarFeedsAction,
} from "@/lib/actions/owner";
import { fmtDateTime } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

/**
 * Externe agenda's (Apple, Google, schoolrooster) als blokken. De app leest
 * de .ics-link elke zes uur opnieuw, dus roosterwijzigingen komen vanzelf mee.
 */
export function CalendarFeeds({ feeds }: { feeds: Tables<"calendar_feeds">[] }) {
  const [label, setLabel] = useState("Schoolrooster");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {feeds.map((feed) => (
        <Card key={feed.id}>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold">📅 {feed.label}</p>
                <p className="truncate text-xs text-muted-foreground">{feed.url}</p>
              </div>
              <button
                type="button"
                aria-label={`Verwijder ${feed.label}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteCalendarFeed(feed.id);
                    if (!result.ok) toast.error(result.error);
                    else toast.success("Agenda losgekoppeld");
                  })
                }
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {feed.last_error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                ⚠ {feed.last_error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {feed.event_count} afspraken
                {feed.last_synced_at ? ` · bijgewerkt ${fmtDateTime(feed.last_synced_at)}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {feeds.length > 0 ? (
        <Button
          variant="outline"
          className="h-11 w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await syncCalendarFeedsAction();
              if (result.ok) toast.success("Agenda bijgewerkt 📅");
              else toast.error(result.error);
            })
          }
        >
          <RefreshCw className="size-4" /> Nu bijwerken
        </Button>
      ) : null}

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="feed-label" className="label-eyebrow">
              Naam
            </Label>
            <Input
              id="feed-label"
              value={label}
              maxLength={40}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feed-url" className="label-eyebrow">
              Agenda-link (.ics)
            </Label>
            <Input
              id="feed-url"
              value={url}
              placeholder="webcal://p01-caldav.icloud.com/published/..."
              onChange={(e) => setUrl(e.target.value)}
              className="h-11"
            />
          </div>

          <Button
            className="h-11 w-full"
            disabled={pending || url.trim().length === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await addCalendarFeed(label, url);
                if (result.ok) {
                  setUrl("");
                  toast.success("Agenda gekoppeld 📅");
                } else toast.error(result.error);
              })
            }
          >
            {pending ? "Ophalen…" : "Agenda koppelen"}
          </Button>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">
              Waar vind ik die link?
            </summary>
            <div className="space-y-2 pt-2 leading-relaxed">
              <p>
                <strong>iPhone:</strong> Agenda-app → tik op <em>Agenda&apos;s</em> onderaan →
                tik op de ⓘ naast je agenda → zet <em>Openbare agenda</em> aan → <em>Deel link</em>.
              </p>
              <p>
                <strong>Mac:</strong> Agenda → rechtsklik op de agenda → <em>Deel agenda</em> →
                vink <em>Openbare agenda</em> aan → kopieer de link.
              </p>
              <p>
                <strong>Google Agenda:</strong> instellingen van de agenda → <em>Geheim adres
                in iCal-indeling</em>.
              </p>
              <p className="text-[11px]">
                Alleen de tijden worden overgenomen als &ldquo;bezet&rdquo;. Hele dagen worden
                overgeslagen. Vrienden zien nooit de titels, enkel dat je bezet bent.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
