"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

/**
 * Kleine OpenStreetMap-kaart. Leaflet praat rechtstreeks met de DOM, dus we
 * laden het pas in de browser (deze component wordt met ssr:false ingeladen)
 * en zetten het standaard-markericoon handmatig goed.
 */
export default function MiniMap({
  lat,
  lng,
  draggable = false,
  onMove,
  className = "h-48",
}: {
  lat: number;
  lng: number;
  draggable?: boolean;
  onMove?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onMoveRef = useRef(onMove);

  // Refs bijwerken hoort in een effect, niet tijdens de render.
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !container.current || map.current) return;

      // Het standaardicoon verwijst naar bestanden die de bundler niet kent.
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const instance = L.map(container.current, {
        attributionControl: true,
        zoomControl: false,
      }).setView([lat, lng], 15);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(instance);

      const pin = L.marker([lat, lng], { icon, draggable }).addTo(instance);
      if (draggable) {
        pin.on("dragend", () => {
          const position = pin.getLatLng();
          onMoveRef.current?.(position.lat, position.lng);
        });
      }

      map.current = instance;
      marker.current = pin;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // Alleen opzetten bij mount; verplaatsen gebeurt in het effect hieronder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng([lat, lng]);
    map.current.setView([lat, lng], map.current.getZoom());
  }, [lat, lng]);

  return <div ref={container} className={`w-full overflow-hidden rounded-xl ${className}`} />;
}
