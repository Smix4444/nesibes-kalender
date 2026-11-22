"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";

const PREFS: { key: string; label: string }[] = [
  { key: "requests", label: "Aanvragen en antwoorden" },
  { key: "reminders", label: "Herinneringen (24u en 1u)" },
  { key: "free_today", label: "Nesibe is vrij vandaag" },
  { key: "group", label: "Groepsactiviteiten en polls" },
  { key: "auction", label: "Veilingen en biedingen" },
  { key: "monthly", label: "Maandmunten en Wrapped" },
  { key: "badges", label: "Nieuwe badges" },
  { key: "memories", label: "Foto's van afspraken" },
];

export function NotificationPrefs({ prefs }: { prefs: Json }) {
  const initial = (prefs ?? {}) as Record<string, boolean>;
  const [values, setValues] = useState<Record<string, boolean>>(initial);
  const [, startTransition] = useTransition();

  function update(key: string, enabled: boolean) {
    const next = { ...values, [key]: enabled };
    setValues(next);

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ notif_prefs: next })
        .eq("id", user.id);
      if (error) {
        toast.error("Opslaan mislukt");
        setValues(values);
      }
    });
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border py-0">
        {PREFS.map((pref) => (
          <div key={pref.key} className="flex min-h-12 items-center justify-between gap-3 py-2.5">
            <span className="text-sm">{pref.label}</span>
            <Switch
              checked={values[pref.key] !== false}
              onCheckedChange={(checked) => update(pref.key, checked)}
              aria-label={pref.label}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
