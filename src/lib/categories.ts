/**
 * Categorieën van afspraken. Deze lijst wordt gespiegeld in SQL
 * (enum `appt_category` + `private.category_emoji`/`private.category_verb`),
 * dus hou beide kanten gelijk bij een wijziging.
 */
export type AppointmentCategory =
  | "koffie"
  | "eten"
  | "brunch"
  | "shoppen"
  | "film"
  | "sport"
  | "studeren"
  | "uitgaan"
  | "wandelen"
  | "gaming"
  | "selfcare"
  | "anders";

export type CategoryMeta = {
  label: string;
  emoji: string;
  color: string;
  /** gebruikt in meldingen: "Tuana wil <verb>" */
  verb: string;
};

export const CATEGORIES: Record<AppointmentCategory, CategoryMeta> = {
  koffie: { label: "Koffie", emoji: "☕", color: "#8B5E3C", verb: "koffie drinken" },
  eten: { label: "Eten", emoji: "🍝", color: "#E4572E", verb: "gaan eten" },
  brunch: { label: "Brunch", emoji: "🥞", color: "#F4A259", verb: "brunchen" },
  shoppen: { label: "Shoppen", emoji: "🛍️", color: "#C86FC9", verb: "gaan shoppen" },
  film: { label: "Film", emoji: "🎬", color: "#3D5A80", verb: "een film kijken" },
  sport: { label: "Sport", emoji: "🏋️", color: "#2BB673", verb: "gaan sporten" },
  studeren: { label: "Studeren", emoji: "📚", color: "#5C7AEA", verb: "samen studeren" },
  uitgaan: { label: "Uitgaan", emoji: "🪩", color: "#9B5DE5", verb: "uitgaan" },
  wandelen: { label: "Wandelen", emoji: "🚶‍♀️", color: "#6A994E", verb: "gaan wandelen" },
  gaming: { label: "Gaming", emoji: "🎮", color: "#00BBF9", verb: "gamen" },
  selfcare: { label: "Selfcare", emoji: "💅", color: "#FF8FAB", verb: "een selfcare-dag doen" },
  anders: { label: "Anders", emoji: "✨", color: "#8A7F78", verb: "afspreken" },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([key, meta]) => ({
  key: key as AppointmentCategory,
  ...meta,
}));

export function categoryMeta(category: string | null | undefined): CategoryMeta {
  if (category && category in CATEGORIES) {
    return CATEGORIES[category as AppointmentCategory];
  }
  return CATEGORIES.anders;
}
