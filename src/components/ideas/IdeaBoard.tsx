"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LIST, categoryMeta, type AppointmentCategory } from "@/lib/categories";
import type { IdeaRow } from "@/app/(app)/ideas/page";
import { cn } from "@/lib/utils";

export function IdeaBoard({
  ideas,
  myId,
  canManage,
}: {
  ideas: IdeaRow[];
  myId: string;
  canManage: boolean;
}) {
  const open = ideas.filter((i) => !i.done);
  const done = ideas.filter((i) => i.done);

  return (
    <Tabs defaultValue="open">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="open">💡 Te doen ({open.length})</TabsTrigger>
        <TabsTrigger value="done">✅ Gedaan ({done.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="open" className="space-y-3 pt-3">
        <NewIdeaForm />
        <IdeaList ideas={sortByVotes(open)} myId={myId} canManage={canManage} />
      </TabsContent>

      <TabsContent value="done" className="space-y-3 pt-3">
        <IdeaList ideas={done} myId={myId} canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}

const sortByVotes = (list: IdeaRow[]) =>
  [...list].sort((a, b) => b.idea_votes.length - a.idea_votes.length);

function IdeaList({
  ideas,
  myId,
  canManage,
}: {
  ideas: IdeaRow[];
  myId: string;
  canManage: boolean;
}) {
  if (ideas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Nog niks hier. Wat zouden jullie eens moeten doen? 💭
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {ideas.map((idea) => (
        <li key={idea.id}>
          <IdeaCard idea={idea} myId={myId} canManage={canManage} />
        </li>
      ))}
    </ul>
  );
}

function IdeaCard({ idea, myId, canManage }: { idea: IdeaRow; myId: string; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = categoryMeta(idea.category);
  const voted = idea.idea_votes.some((v) => v.user_id === myId);
  const mine = idea.created_by === myId;

  function toggleVote() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = voted
        ? await supabase.from("idea_votes").delete().eq("idea_id", idea.id).eq("user_id", myId)
        : await supabase.from("idea_votes").insert({ idea_id: idea.id, user_id: myId });

      if (error) toast.error("Stemmen lukte niet");
      else router.refresh();
    });
  }

  function markDone() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("ideas").update({ done: !idea.done }).eq("id", idea.id);
      if (error) toast.error("Bijwerken lukte niet");
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex gap-3 py-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${meta.color}22` }}
          aria-hidden
        >
          {meta.emoji}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("font-heading font-bold", idea.done && "line-through opacity-60")}>
            {idea.title}
          </p>
          {idea.description ? (
            <p className="text-sm text-muted-foreground">{idea.description}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={toggleVote}
              disabled={pending}
              aria-pressed={voted}
              className={cn(
                "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold",
                voted ? "border-cig bg-cig/10 text-cig" : "border-border",
              )}
            >
              <Flame className="size-3.5" />
              {idea.idea_votes.length}
            </button>

            {!idea.done ? (
              <Button
                size="sm"
                className="h-9"
                render={
                  <Link
                    href={`/new?title=${encodeURIComponent(idea.title)}&category=${idea.category}&idea=${idea.id}`}
                  />
                }
              >
                Plan dit!
              </Button>
            ) : null}

            {mine || canManage ? (
              <button
                type="button"
                onClick={markDone}
                disabled={pending}
                className="min-h-9 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
              >
                {idea.done ? "Terugzetten" : "Markeer als gedaan"}
              </button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewIdeaForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AppointmentCategory>("anders");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" className="h-11 w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Nieuw idee
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="idea-title">Wat zouden jullie eens moeten doen?</Label>
          <Input
            id="idea-title"
            value={title}
            maxLength={80}
            placeholder="Samen sushi maken"
            onChange={(e) => setTitle(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="idea-description">Extra uitleg (optioneel)</Label>
          <Textarea
            id="idea-description"
            value={description}
            maxLength={300}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <ul className="flex flex-wrap gap-2">
          {CATEGORY_LIST.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => setCategory(c.key)}
                aria-pressed={category === c.key}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold",
                  category === c.key ? "border-cig bg-cig/10 text-cig" : "border-border",
                )}
              >
                {c.emoji} {c.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button
            className="h-11 flex-1"
            disabled={pending || title.trim().length < 2}
            onClick={() =>
              startTransition(async () => {
                const supabase = createClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;

                const { error } = await supabase.from("ideas").insert({
                  title: title.trim(),
                  description: description.trim() || null,
                  category,
                  created_by: user.id,
                });

                if (error) toast.error("Opslaan lukte niet");
                else {
                  setTitle("");
                  setDescription("");
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            Posten 💡
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
