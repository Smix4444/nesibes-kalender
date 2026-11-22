/**
 * Centrale app-configuratie. De werknaam van de app staat hier en nergens
 * anders hardcoded, zodat hij in één keer te vervangen is.
 */
export const APP_NAME = "NesiPlan";
export const APP_DESCRIPTION =
  "Vraag een afspraak aan bij Nesibe — met çiğköftes, veilingen en veel te veel emoji.";

/** Alle tijden worden opgeslagen als timestamptz en getoond in deze zone. */
export const TZ = "Europe/Brussels";

/** Het muntje. Puur virtueel, puur voor de leukigheid. */
export const COIN_EMOJI = "🌶️";
export const COIN_NAME = "çiğköfte";
export const COIN_NAME_PLURAL = "çiğköftes";

export type AppRole = "owner" | "admin" | "vip" | "member";

/**
 * Prioriteitsgewicht voor sortering en tie-breaks.
 * admin (Rayan) > vip (Dragos) > member. Owner staat erboven maar doet
 * nooit mee als aanvrager.
 */
export const ROLE_WEIGHT: Record<AppRole, number> = {
  owner: 4,
  admin: 3,
  vip: 2,
  member: 0,
};

export const ROLE_META: Record<
  AppRole,
  {
    label: string;
    emoji: string;
    /** badge-code in de badges-tabel */
    badge: string;
    /** gratis priority-aanvragen? */
    freePriority: boolean;
    /** mag buiten Nesibe's vrije uren aanvragen? */
    bypassAvailability: boolean;
  }
> = {
  owner: { label: "Queen", emoji: "👑", badge: "owner", freePriority: true, bypassAvailability: true },
  admin: { label: "De BF", emoji: "💞", badge: "bf", freePriority: true, bypassAvailability: true },
  vip: { label: "VIP", emoji: "⭐", badge: "vip", freePriority: true, bypassAvailability: false },
  member: { label: "Vriend", emoji: "🙂", badge: "", freePriority: false, bypassAvailability: false },
};

/** Duur-chips in de wizard (minuten). */
export const DURATION_CHOICES = [30, 60, 90, 120, 180] as const;

/** Tijdkeuzes in de wizard gaan per kwartier. */
export const SLOT_STEP_MINUTES = 15;

/** Hoeveel dagen de dagenstrip op Home en in de wizard vooruit kijkt. */
export const DAY_STRIP_DAYS = 14;

/** Fallbacks; de echte waarden komen uit de tabel app_settings. */
export const DEFAULT_SETTINGS = {
  monthly_coins: 2,
  coin_cap: 6,
  min_notice_minutes: 60,
  max_photos_per_user_per_appt: 10,
} as const;
