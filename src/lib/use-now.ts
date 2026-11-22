"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK_MS);
  return () => clearInterval(id);
}

// Afgerond op blokjes van 30 seconden, zodat opeenvolgende reads tijdens één
// render dezelfde waarde geven (vereiste van useSyncExternalStore).
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/**
 * De huidige tijd als render-veilige waarde. Tikt elke 30 seconden, zodat
 * bijvoorbeeld de check-in-knop vanzelf verschijnt zodra het venster opengaat.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
