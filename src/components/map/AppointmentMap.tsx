"use client";

import dynamic from "next/dynamic";

// Leaflet raakt de DOM aan, dus nooit op de server renderen.
const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />,
});

export function AppointmentMap({ lat, lng }: { lat: number; lng: number }) {
  return <MiniMap lat={lat} lng={lng} className="h-40" />;
}
