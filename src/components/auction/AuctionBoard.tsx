"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Avatar } from "@/components/people/Avatar";
import { UserName } from "@/components/people/UserName";
import { BidSheet } from "@/components/auction/BidSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { closeAuction } from "@/lib/actions/appointments";
import { categoryMeta } from "@/lib/categories";
import { COIN_EMOJI, type AppRole } from "@/lib/config";
import { fmtLongDateTime, fmtTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { useNow } from "@/lib/use-now";
import type { Database, Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Bid = {
  id: string;
  amount: number;
  sweetener: string | null;
  updated_at: string;
  user_id: string;
  appointment_id: string;
  role: AppRole;
  is_priority: boolean;
  profiles: {
    id: string;
    display_name: string;
    emoji: string;
    color: string;
    avatar_url: string | null;
    role: AppRole;
  };
  appointments: {
    id: string;
    title: string;
    category: Database["public"]["Enums"]["appt_category"];
    starts_at: string | null;
    ends_at: string | null;
    is_priority: boolean;
    status: Database["public"]["Enums"]["appt_status"];
  };
};

export function AuctionBoard({
  auction,
  bids,
  viewerId,
  viewerRole,
  balance,
}: {
  auction: Tables<"auctions">;
  bids: Bid[];
  viewerId: string;
  viewerRole: AppRole;
  balance: number;
}) {
  const router = useRouter();
  const now = useNow();
  const [pending, startTransition] = useTransition();
  const [alsoAccept, setAlsoAccept] = useState<string[]>([]);

  const isOwner = viewerRole === "owner";
  const myBid = bids.find((b) => b.user_id === viewerId);
  const open = auction.status === "open";
  const closesIn = new Date(auction.closes_at).getTime() - now;

  // Live bijwerken terwijl anderen bieden.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${auction.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `auction_id=eq.${auction.id}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auction.id, router]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">⚔️ Veiling</h1>
        <p className="text-sm text-muted-foreground">
          {open ? (
            closesIn > 0 ? (
              <>Sluit over {formatCountdown(closesIn)} · {bids.length} kanshebbers</>
            ) : (
              <>Gesloten voor nieuwe biedingen — Nesibe kiest nu</>
            )
          ) : (
            <>Deze veiling is {auction.status === "closed" ? "beslist" : auction.status}</>
          )}
        </p>
      </header>

      {!isOwner && open && closesIn > 0 && myBid ? (
        <BidSheet
          auctionId={auction.id}
          current={myBid.amount}
          sweetener={myBid.sweetener}
          balance={balance}
        />
      ) : null}

      <ul className="space-y-3">
        {bids.map((bid, index) => {
          const meta = categoryMeta(bid.appointments.category);
          const recommended = index === 0 && open;
          const isWinner = auction.winner_appointment_id === bid.appointment_id;

          return (
            <li key={bid.id}>
              <Card
                className={cn(
                  recommended && "border-cig",
                  isWinner && "border-success bg-success/5",
                  bid.user_id === viewerId && "ring-1 ring-cig/30",
                )}
              >
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start gap-3">
                    <Avatar profile={bid.profiles} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <UserName profile={bid.profiles} className="text-sm font-bold" />
                        {recommended ? (
                          <span className="rounded-full bg-cig/15 px-1.5 text-[10px] font-bold text-cig">
                            🏆 aanbevolen
                          </span>
                        ) : null}
                        {isWinner ? (
                          <span className="rounded-full bg-success/15 px-1.5 text-[10px] font-bold text-success">
                            🏆 gewonnen
                          </span>
                        ) : null}
                        {bid.appointments.is_priority ? (
                          <span className="rounded-full bg-cig/15 px-1.5 text-[10px] font-bold text-cig">
                            {COIN_EMOJI} priority
                          </span>
                        ) : null}
                      </div>
                      <p className="font-heading font-extrabold">
                        {meta.emoji} {bid.appointments.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bid.appointments.starts_at
                          ? `${fmtLongDateTime(bid.appointments.starts_at)}${
                              bid.appointments.ends_at
                                ? ` – ${fmtTime(bid.appointments.ends_at)}`
                                : ""
                            }`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-2xl font-extrabold tabular-nums">
                        {bid.amount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{COIN_EMOJI}</p>
                    </div>
                  </div>

                  {bid.sweetener ? (
                    <p className="rounded-lg bg-muted px-3 py-1.5 text-sm">
                      🎁 &ldquo;{bid.sweetener}&rdquo;
                    </p>
                  ) : null}

                  {isOwner && open ? (
                    <div className="space-y-2">
                      <Button
                        className="h-11 w-full font-bold"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await closeAuction(
                              auction.id,
                              bid.appointment_id,
                              alsoAccept.filter((id) => id !== bid.appointment_id),
                            );
                            if (result.ok) {
                              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                              toast.success("Winnaar gekozen 🏆");
                            } else toast.error(result.error);
                          })
                        }
                      >
                        Kies deze 🏆
                      </Button>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={alsoAccept.includes(bid.appointment_id)}
                          onCheckedChange={(checked) =>
                            setAlsoAccept((prev) =>
                              checked === true
                                ? [...prev, bid.appointment_id]
                                : prev.filter((id) => id !== bid.appointment_id),
                            )
                          }
                        />
                        Ook accepteren (bod krijgt die persoon terug)
                      </label>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {isOwner ? (
        <p className="text-center text-xs text-muted-foreground">
          🏆 is maar een suggestie — jij kiest wie je wil.
        </p>
      ) : null}
    </div>
  );
}

function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u${String(minutes % 60).padStart(2, "0")}`;
  return `${Math.floor(hours / 24)} dagen`;
}
