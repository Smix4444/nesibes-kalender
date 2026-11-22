import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WrappedStories } from "@/components/wrapped/WrappedStories";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Wrapped" };

export default async function WrappedPage({ params }: PageProps<"/wrapped/[period]">) {
  const { period } = await params;
  const profile = await requireProfile();

  // De URL gebruikt "2026-11", de tabel de eerste van de maand.
  if (!/^\d{4}-\d{2}$/.test(period)) notFound();
  const periodDate = `${period}-01`;

  const supabase = await createClient();
  const { data: wrapped } = await supabase
    .from("wrapped")
    .select("data")
    .eq("user_id", profile.id)
    .eq("period", periodDate)
    .maybeSingle();

  if (!wrapped) notFound();

  return <WrappedStories data={wrapped.data as Record<string, unknown>} name={profile.display_name} />;
}
