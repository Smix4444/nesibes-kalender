"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GeocodeHit } from "@/app/api/geocode/route";
import type { Tables } from "@/lib/database.types";

// Leaflet mag alleen client-side laden.
const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />,
});

export type ChosenPlace = {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

export function LocationPicker({
  value,
  onChange,
  savedPlaces = [],
}: {
  value: ChosenPlace | null;
  onChange: (place: ChosenPlace | null) => void;
  savedPlaces?: Tables<"saved_places">[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounce: Nominatim mag hooguit één verzoek per seconde krijgen.
  useEffect(() => {
    const term = query.trim();

    // Alles gebeurt in de timeout: zo blijft de effect-body zelf zonder
    // setState, en wachten we netjes 500 ms tussen twee zoekopdrachten.
    const timer = setTimeout(async () => {
      if (term.length < 3) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`);
        const data = await response.json();
        setResults(data.results ?? []);
      } catch {
        toast.error("Zoeken lukte niet");
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  async function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Je toestel deelt geen locatie");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
        const data = await response.json();
        const hit: GeocodeHit | undefined = data.results?.[0];
        onChange({
          name: hit?.name ?? "Mijn locatie",
          address: hit?.address ?? null,
          lat: latitude,
          lng: longitude,
        });
      },
      () => toast.error("Locatie ophalen lukte niet"),
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="place">Waar spreken jullie af?</Label>
        <div className="flex gap-2">
          <Input
            id="place"
            value={query}
            placeholder="Kolonel Koffie, Antwerpen"
            onChange={(e) => setQuery(e.target.value)}
            className="h-11"
          />
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0"
            aria-label="Gebruik mijn locatie"
            onClick={useMyLocation}
          >
            <LocateFixed className="size-4" />
          </Button>
        </div>
      </div>

      {savedPlaces.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {savedPlaces.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    name: place.name,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng,
                  })
                }
                className="min-h-9 rounded-full border border-border bg-card px-3 text-xs font-semibold"
              >
                <Star className="mr-1 inline size-3" />
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {searching ? <p className="text-xs text-muted-foreground">Zoeken…</p> : null}

      {results.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {results.map((hit) => (
            <li key={`${hit.lat},${hit.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ name: hit.name, address: hit.address, lat: hit.lat, lng: hit.lng });
                  setResults([]);
                  setQuery("");
                }}
                className="flex min-h-12 w-full items-start gap-2 px-3 py-2 text-left text-sm"
              >
                <Search className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-medium">{hit.name}</span>
                  <span className="block text-xs text-muted-foreground">{hit.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {value ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">📍 {value.name}</p>
              {value.address ? (
                <p className="truncate text-xs text-muted-foreground">{value.address}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 text-xs font-semibold text-muted-foreground"
            >
              Wissen
            </button>
          </div>
          <MiniMap
            lat={value.lat}
            lng={value.lng}
            draggable
            onMove={(lat, lng) => onChange({ ...value, lat, lng })}
          />
          <p className="text-xs text-muted-foreground">Sleep de speld om bij te sturen.</p>
        </div>
      ) : null}
    </div>
  );
}
