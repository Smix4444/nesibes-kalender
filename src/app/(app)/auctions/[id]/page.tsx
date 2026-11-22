import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AuctionBoard } from "@/components/auction/AuctionBoard";
import { requireProfile } from "@/lib/auth";
import { getBalance } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { sortBids } from "@/lib/priority";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Veiling" };

type BidRow = {
  id: string;
  amount: number;
  sweetener: string | null;
  updated_at: string;
  user_id: string;
  appointment_id: string;
  profiles: {
    id: string;
    display_name: string;
    emoji: string;
    color: string;
    avatar_url: string | null;
    role: Database["public"]["Enums"]["app_role"];
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

export default async function AuctionPage({ params }: PageProps<"/auctions/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: auction } = await supabase.from("auctions").select("*").eq("id", id).maybeSingle();
  if (!auction) notFound();

  const [{ data: bids }, balance] = await Promise.all([
    supabase
      .from("bids")
      .select(
        `id, amount, sweetener, updated_at, user_id, appointment_id,
         profiles(id, display_name, emoji, color, avatar_url, role),
         appointments(id, title, category, starts_at, ends_at, is_priority, status)`,
      )
      .eq("auction_id", id)
      .returns<BidRow[]>(),
    getBalance(profile.id),
  ]);

  // Alleen aanvragen die nog meedoen; gesloten veilingen tonen we zoals ze zijn.
  const active = (bids ?? []).filter((b) =>
    auction.status === "open" ? b.appointments.status === "auction" : true,
  );

  const ranked = sortBids(
    active.map((b) => ({
      ...b,
      role: b.profiles.role,
      is_priority: b.appointments.is_priority,
    })),
  );

  return (
    <AuctionBoard
      auction={auction}
      bids={ranked}
      viewerId={profile.id}
      viewerRole={profile.role}
      balance={balance}
    />
  );
}
