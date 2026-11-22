import type { Metadata } from "next";
import { IdeaBoard } from "@/components/ideas/IdeaBoard";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Ideeën" };

export type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  category: Database["public"]["Enums"]["appt_category"];
  done: boolean;
  created_by: string;
  created_at: string;
  idea_votes: { user_id: string }[];
};

export default async function IdeasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: ideas } = await supabase
    .from("ideas")
    .select("id, title, description, category, done, created_by, created_at, idea_votes(user_id)")
    .order("created_at", { ascending: false })
    .returns<IdeaRow[]>();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Ideeënbord 💡</h1>
        <p className="text-sm text-muted-foreground">
          Post wat je ooit eens wil doen en stem op elkaars plannen.
        </p>
      </header>

      <IdeaBoard ideas={ideas ?? []} myId={profile.id} canManage={profile.role !== "member"} />
    </div>
  );
}
