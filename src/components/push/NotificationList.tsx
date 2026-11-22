"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fmtDateTime } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function NotificationList({
  notifications,
  userId,
}: {
  notifications: Tables<"notifications">[];
  userId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read_at);

  // Nieuwe meldingen komen binnen terwijl je kijkt.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Nog geen meldingen. Stil hier 🤫
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {unread.length > 0 ? (
        <Button
          variant="outline"
          className="h-11 w-full"
          disabled={pending}
          onClick={() => startTransition(() => markRead(unread.map((n) => n.id)))}
        >
          Alles als gelezen markeren ({unread.length})
        </Button>
      ) : null}

      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <Link
              href={notification.url}
              onClick={() => startTransition(() => markRead([notification.id]))}
              className={cn(
                "block rounded-2xl border px-3 py-3 transition-colors",
                notification.read_at
                  ? "border-border bg-card"
                  : "border-cig/40 bg-cig/5",
              )}
            >
              <p className="font-heading text-sm font-bold">{notification.title}</p>
              <p className="text-sm text-muted-foreground">{notification.body}</p>
              <p className="pt-1 text-[11px] text-muted-foreground">
                {fmtDateTime(notification.created_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
