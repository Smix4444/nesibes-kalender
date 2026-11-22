"use client";

import { Avatar } from "@/components/people/Avatar";
import { UserName } from "@/components/people/UserName";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Person = Pick<
  Tables<"profiles">,
  "id" | "display_name" | "emoji" | "color" | "avatar_url" | "role"
>;

export function PeoplePicker({
  people,
  groups,
  userIds,
  groupIds,
  onUserIds,
  onGroupIds,
}: {
  people: Person[];
  groups: (Tables<"groups"> & { group_members: { user_id: string }[] })[];
  userIds: string[];
  groupIds: string[];
  onUserIds: (ids: string[]) => void;
  onGroupIds: (ids: string[]) => void;
}) {
  const toggle = (list: string[], id: string, set: (ids: string[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  // Iedereen die al via een groep meedoet, hoef je niet apart te taggen.
  const viaGroups = new Set(
    groups.filter((g) => groupIds.includes(g.id)).flatMap((g) => g.group_members.map((m) => m.user_id)),
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Groepen</Label>
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => toggle(groupIds, group.id, onGroupIds)}
                aria-pressed={groupIds.includes(group.id)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                  groupIds.includes(group.id) ? "border-cig bg-cig text-white" : "border-border bg-card",
                )}
              >
                {group.emoji} {group.name}
              </button>
            </li>
          ))}
        </ul>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen groepen. Rayan maakt ze aan bij Beheer.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Losse mensen</Label>
        <p className="text-xs text-muted-foreground">
          Tag je Nesibe, dan moet zij de afspraak nog bevestigen. Zonder haar
          staat hij meteen vast.
        </p>
        <ul className="space-y-1">
          {people.map((person) => {
            const included = viaGroups.has(person.id);
            const checked = userIds.includes(person.id) || included;

            return (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={included}
                  onClick={() => toggle(userIds, person.id, onUserIds)}
                  aria-pressed={checked}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors",
                    checked ? "border-cig bg-cig/10" : "border-border bg-card",
                    included && "opacity-60",
                  )}
                >
                  <Avatar profile={person} size={32} />
                  <UserName profile={person} className="flex-1 text-sm font-medium" />
                  {included ? (
                    <span className="text-xs text-muted-foreground">via groep</span>
                  ) : checked ? (
                    <span aria-hidden>✅</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
