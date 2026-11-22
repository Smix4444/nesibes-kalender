"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/people/Avatar";
import { UserName } from "@/components/people/UserName";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adjustCoins,
  createGroup,
  deleteGroup,
  deleteUser,
  setRole,
  toggleGroupMember,
  updateInviteCode,
  updateSettings,
} from "@/lib/actions/admin";
import { COIN_EMOJI } from "@/lib/config";
import type { Database, Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type AppRole = Database["public"]["Enums"]["app_role"];
type Person = Tables<"profiles">;
type Group = Tables<"groups"> & { group_members: { user_id: string }[] };

const ROLES: AppRole[] = ["member", "vip", "admin"];

export function AdminPanel({
  people,
  groups,
  balances,
  settings,
  isAdmin,
  myId,
}: {
  people: Person[];
  groups: Group[];
  balances: Record<string, number>;
  settings: Tables<"app_settings"> | null;
  /** Rayan mag alles; Nesibe mag rollen, groepen en instellingen. */
  isAdmin: boolean;
  myId: string;
}) {
  return (
    <Tabs defaultValue="people">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="people">Mensen</TabsTrigger>
        <TabsTrigger value="groups">Groepen</TabsTrigger>
        <TabsTrigger value="settings">Instellingen</TabsTrigger>
      </TabsList>

      <TabsContent value="people" className="space-y-2 pt-3">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            balance={balances[person.id] ?? 0}
            isAdmin={isAdmin}
            isSelf={person.id === myId}
          />
        ))}
      </TabsContent>

      <TabsContent value="groups" className="space-y-3 pt-3">
        <GroupEditor groups={groups} people={people} readOnly={false} />
      </TabsContent>

      <TabsContent value="settings" className="space-y-3 pt-3">
        <SettingsEditor settings={settings} readOnly={false} isAdmin={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}

function PersonRow({
  person,
  balance,
  isAdmin,
  isSelf,
}: {
  person: Person;
  balance: number;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const isOwner = person.role === "owner";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(result.error ?? "Mislukt");
      else toast.success("Aangepast");
    });

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar profile={person} size={36} />
          <div className="min-w-0 flex-1">
            <UserName profile={person} className="text-sm font-bold" />
            <p className="text-xs text-muted-foreground">@{person.username}</p>
          </div>
          <span className="text-sm font-bold text-cig tabular-nums">
            {COIN_EMOJI} {balance}
          </span>
        </div>

        {!isOwner ? (
          <>
            <div className="flex gap-1.5">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  disabled={pending}
                  aria-pressed={person.role === role}
                  onClick={() => run(() => setRole(person.id, role))}
                  className={cn(
                    "min-h-9 flex-1 rounded-lg border text-xs font-semibold capitalize",
                    person.role === role ? "border-cig bg-cig/10 text-cig" : "border-border",
                  )}
                >
                  {role}
                </button>
              ))}
            </div>

            {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={pending}
                onClick={() => run(() => adjustCoins(person.id, -1, "Bijgesteld"))}
              >
                <Minus className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={pending}
                onClick={() => run(() => adjustCoins(person.id, 1, "Cadeautje"))}
              >
                <Plus className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">çiğköftes</span>

              {!isSelf ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto h-9"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`${person.display_name} definitief verwijderen?`)) return;
                    run(() => deleteUser(person.id));
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GroupEditor({
  groups,
  people,
  readOnly,
}: {
  groups: Group[];
  people: Person[];
  readOnly: boolean;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(result.error ?? "Mislukt");
    });

  return (
    <>
      {groups.map((group) => {
        const members = new Set(group.group_members.map((m) => m.user_id));

        return (
          <Card key={group.id}>
            <CardContent className="space-y-2 py-3">
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold">
                  {group.emoji} {group.name}
                </p>
                {!readOnly ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    disabled={pending}
                    onClick={() => run(() => deleteGroup(group.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {people
                  .filter((p) => p.role !== "owner")
                  .map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        disabled={readOnly || pending}
                        aria-pressed={members.has(person.id)}
                        onClick={() =>
                          run(() => toggleGroupMember(group.id, person.id, !members.has(person.id)))
                        }
                        className={cn(
                          "min-h-9 rounded-full border px-3 text-xs font-semibold",
                          members.has(person.id)
                            ? "border-cig bg-cig/10 text-cig"
                            : "border-border",
                        )}
                      >
                        {person.emoji} {person.display_name}
                      </button>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {!readOnly ? (
        <Card>
          <CardContent className="flex items-end gap-2 py-3">
            <div className="w-16 space-y-1">
              <Label htmlFor="group-emoji" className="text-xs">
                Emoji
              </Label>
              <Input
                id="group-emoji"
                value={emoji}
                maxLength={4}
                onChange={(e) => setEmoji(e.target.value)}
                className="h-11 text-center"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="group-name" className="text-xs">
                Nieuwe groep
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              className="h-11"
              disabled={pending || name.trim().length === 0}
              onClick={() =>
                run(async () => {
                  const result = await createGroup(name.trim(), emoji);
                  if (result.ok) setName("");
                  return result;
                })
              }
            >
              Maak
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function SettingsEditor({
  settings,
  readOnly,
  isAdmin,
}: {
  settings: Tables<"app_settings"> | null;
  readOnly: boolean;
  isAdmin: boolean;
}) {
  const [monthly, setMonthly] = useState(settings?.monthly_coins ?? 2);
  const [cap, setCap] = useState(settings?.coin_cap ?? 6);
  const [notice, setNotice] = useState(settings?.min_notice_minutes ?? 60);
  const [scope, setScope] = useState(settings?.auction_scope ?? "same_day");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Card>
        <CardContent className="space-y-3 py-4">
          <NumberField label="Çiğköftes per maand" value={monthly} onChange={setMonthly} disabled={readOnly} />
          <NumberField label="Maximum saldo" value={cap} onChange={setCap} disabled={readOnly} />
          <NumberField
            label="Minimaal op voorhand (min)"
            value={notice}
            onChange={setNotice}
            disabled={readOnly}
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Veiling bij</Label>
            <div className="flex gap-2">
              {[
                { value: "same_day", label: "zelfde dag" },
                { value: "overlap", label: "overlappende tijd" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={scope === option.value}
                  onClick={() => setScope(option.value)}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border text-sm font-semibold",
                    scope === option.value ? "border-cig bg-cig/10 text-cig" : "border-border",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!readOnly ? (
            <Button
              className="h-11 w-full"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateSettings({
                    monthly_coins: monthly,
                    coin_cap: cap,
                    min_notice_minutes: notice,
                    auction_scope: scope,
                  });
                  if (result.ok) toast.success("Opgeslagen");
                  else toast.error(result.error);
                })
              }
            >
              Opslaan
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            <Label htmlFor="invite" className="text-xs">
              Nieuwe uitnodigingscode
            </Label>
            <Input
              id="invite"
              value={code}
              placeholder="cigkofte2026"
              onChange={(e) => setCode(e.target.value)}
              className="h-11"
            />
            <Button
              variant="outline"
              className="h-11 w-full"
              disabled={pending || code.trim().length < 4}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateInviteCode(code);
                  if (result.ok) {
                    toast.success("Code gewijzigd 🤫");
                    setCode("");
                  } else toast.error(result.error);
                })
              }
            >
              Code wijzigen
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11"
      />
    </div>
  );
}
