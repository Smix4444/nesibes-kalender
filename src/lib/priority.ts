import { ROLE_WEIGHT, type AppRole } from "@/lib/config";

export type SortableRequest = {
  created_at: string;
  is_priority: boolean;
  role: AppRole;
};

export type SortableBid = {
  amount: number;
  updated_at: string;
  is_priority: boolean;
  role: AppRole;
};

/**
 * Volgorde in Nesibe's inbox: Rayan eerst, dan Dragos, dan priority-aanvragen,
 * en daarbinnen de oudste eerst. Negatief = `a` komt bovenaan.
 */
export function compareRequests(a: SortableRequest, b: SortableRequest): number {
  const weight = ROLE_WEIGHT[b.role] - ROLE_WEIGHT[a.role];
  if (weight !== 0) return weight;

  const priority = Number(b.is_priority) - Number(a.is_priority);
  if (priority !== 0) return priority;

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

/**
 * Aanbevolen winnaar van een veiling: hoogste bod, dan rolgewicht (Rayan wint
 * van Dragos, Dragos van gewone members), dan priority, dan wie het eerst bood.
 * Spiegelt de sortering in close_auction/place_bid.
 */
export function compareBids(a: SortableBid, b: SortableBid): number {
  const amount = b.amount - a.amount;
  if (amount !== 0) return amount;

  const weight = ROLE_WEIGHT[b.role] - ROLE_WEIGHT[a.role];
  if (weight !== 0) return weight;

  const priority = Number(b.is_priority) - Number(a.is_priority);
  if (priority !== 0) return priority;

  return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
}

export const sortRequests = <T extends SortableRequest>(list: T[]): T[] =>
  [...list].sort(compareRequests);

export const sortBids = <T extends SortableBid>(list: T[]): T[] => [...list].sort(compareBids);
