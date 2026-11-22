import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
};

export type GeocodeHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

// Nominatim staat 1 verzoek per seconde toe en wil een echte User-Agent.
// Een kleine cache + wachtrij houdt ons netjes binnen die regels.
const cache = new Map<string, { at: number; hits: GeocodeHit[] }>();
const CACHE_TTL = 10 * 60 * 1000;
let lastCall = 0;

async function throttle() {
  const wait = Math.max(0, 1100 - (Date.now() - lastCall));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCall = Date.now();
}

export async function GET(request: Request) {
  // Alleen voor ingelogde gebruikers: anders is dit een open proxy.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");

  const key = query ? `q:${query.toLowerCase()}` : `r:${lat},${lng}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json({ results: cached.hits });
  }

  const userAgent = process.env.NOMINATIM_USER_AGENT ?? "NesiPlan/1.0";
  let endpoint: string;

  if (query) {
    if (query.length < 3) return NextResponse.json({ results: [] });
    endpoint =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5" +
      `&countrycodes=be,nl&accept-language=nl&q=${encodeURIComponent(query)}`;
  } else if (lat && lng) {
    endpoint =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=nl" +
      `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  } else {
    return NextResponse.json({ error: "Geef q of lat/lng mee" }, { status: 400 });
  }

  await throttle();

  const response = await fetch(endpoint, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Zoeken lukte even niet" }, { status: 502 });
  }

  const payload = (await response.json()) as NominatimResult | NominatimResult[];
  const list = Array.isArray(payload) ? payload : [payload];

  const hits: GeocodeHit[] = list
    .filter((item) => item?.lat && item?.lon)
    .map((item) => ({
      name: item.name || item.display_name.split(",")[0],
      address: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }));

  cache.set(key, { at: Date.now(), hits });
  return NextResponse.json({ results: hits });
}
