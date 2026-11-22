import "server-only";

import ICAL from "ical.js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Hoe ver vooruit we afspraken uit de agenda overnemen. */
const WEEKS_AHEAD = 8;

type Block = { title: string; starts_at: string; ends_at: string; external_uid: string };

/**
 * Haalt één .ics-feed op en zet hem om in blokken. Terugkerende afspraken
 * (een schoolrooster is bijna altijd wekelijks) worden uitgeklapt tot het
 * einde van het venster.
 */
async function readFeed(url: string, from: Date, to: Date): Promise<Block[]> {
  // webcal:// is gewoon https:// met een andere naam.
  const httpUrl = url.replace(/^webcal:\/\//i, "https://");

  const response = await fetch(httpUrl, {
    headers: { "User-Agent": "NesiPlan/1.0", Accept: "text/calendar, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Agenda gaf status ${response.status}`);

  const text = await response.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Dit is geen agenda-bestand (.ics)");

  const comp = new ICAL.Component(ICAL.parse(text));
  const blocks: Block[] = [];

  for (const vevent of comp.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);
    // Hele-dag-afspraken zeggen niets over uren, die slaan we over.
    if (event.startDate?.isDate) continue;

    const title = (event.summary || "Bezet").slice(0, 80);
    const durationSeconds = event.duration ? event.duration.toSeconds() : 3600;

    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next: ICAL.Time | null;
      let guard = 0;

      while ((next = iterator.next()) && guard++ < 500) {
        const start = next.toJSDate();
        if (start >= to) break;
        const end = new Date(start.getTime() + durationSeconds * 1000);
        if (end <= from) continue;

        blocks.push({
          title,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          external_uid: `${event.uid}:${start.toISOString()}`,
        });
      }
    } else {
      const start = event.startDate.toJSDate();
      const end = event.endDate ? event.endDate.toJSDate() : new Date(start.getTime() + 3600_000);
      if (end > from && start < to) {
        blocks.push({
          title,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          external_uid: event.uid,
        });
      }
    }
  }

  return blocks;
}

export type SyncResult = { label: string; events?: number; error?: string };

/** Haalt alle actieve agenda's op en zet ze om in blokken. */
export async function syncCalendarFeeds(): Promise<SyncResult[]> {
  const admin = createAdminClient();
  const { data: feeds } = await admin.from("calendar_feeds").select("*").eq("enabled", true);
  if (!feeds?.length) return [];

  const from = new Date();
  const to = new Date(from.getTime() + WEEKS_AHEAD * 7 * 24 * 3600 * 1000);
  const results: SyncResult[] = [];

  for (const feed of feeds) {
    const source = `ics:${feed.id}`;
    try {
      const blocks = await readFeed(feed.url, from, to);

      // Wat eerder uit deze agenda kwam en nog komt gaat eruit; het verleden
      // blijft staan als geschiedenis.
      await admin
        .from("owner_items")
        .delete()
        .eq("source", source)
        .gte("starts_at", from.toISOString());

      if (blocks.length) {
        await admin.from("owner_items").insert(
          blocks.map((b) => ({
            kind: "block" as const,
            title: b.title,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            source,
            external_uid: b.external_uid,
            notes: `Uit ${feed.label}`,
          })),
        );
      }

      await admin
        .from("calendar_feeds")
        .update({
          last_synced_at: new Date().toISOString(),
          last_error: null,
          event_count: blocks.length,
        })
        .eq("id", feed.id);

      results.push({ label: feed.label, events: blocks.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      await admin
        .from("calendar_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_error: message })
        .eq("id", feed.id);
      results.push({ label: feed.label, error: message });
    }
  }

  return results;
}
