"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addBlock, addTask, deleteOwnerItem, toggleTask } from "@/lib/actions/owner";
import { fmtTime } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

type Item = Tables<"owner_items">;

export function PlanningBoard({
  blocks,
  tasks,
  today,
}: {
  blocks: Item[];
  tasks: Item[];
  today: string;
}) {
  return (
    <Tabs defaultValue="tasks">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tasks">✅ Taken</TabsTrigger>
        <TabsTrigger value="blocks">⛔ Blokken</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="space-y-3 pt-3">
        <TaskList tasks={tasks} />
        <AddTaskForm />
      </TabsContent>

      <TabsContent value="blocks" className="space-y-3 pt-3">
        <BlockList blocks={blocks} />
        <AddBlockForm today={today} />
      </TabsContent>
    </Tabs>
  );
}

function TaskList({ tasks }: { tasks: Item[] }) {
  const [pending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <Empty>Nog geen taken. Heerlijk leeg hoofd 🧘‍♀️</Empty>;
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border py-0">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 py-3">
            <Checkbox
              checked={task.done}
              disabled={pending}
              aria-label={`${task.title} afvinken`}
              onCheckedChange={(checked) =>
                startTransition(async () => {
                  const result = await toggleTask(task.id, checked === true);
                  if (!result.ok) toast.error(result.error);
                })
              }
            />
            <div className="min-w-0 flex-1">
              <p className={task.done ? "text-muted-foreground line-through" : "font-medium"}>
                {task.title}
              </p>
              {task.due_date ? (
                <p className="text-xs text-muted-foreground">tegen {task.due_date}</p>
              ) : null}
            </div>
            <DeleteButton id={task.id} label={task.title} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BlockList({ blocks }: { blocks: Item[] }) {
  if (blocks.length === 0) {
    return <Empty>Vandaag geen blokken. De dag is van jou ✨</Empty>;
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border py-0">
        {blocks.map((block) => (
          <div key={block.id} className="flex items-center gap-3 py-3">
            <span
              className="h-10 w-1.5 shrink-0 rounded-full bg-muted-foreground/40"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{block.title}</p>
              <p className="text-xs text-muted-foreground">
                {block.starts_at ? fmtTime(block.starts_at) : ""} –{" "}
                {block.ends_at ? fmtTime(block.ends_at) : ""}
              </p>
            </div>
            <DeleteButton id={block.id} label={block.title} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DeleteButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={`Verwijder ${label}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await deleteOwnerItem(id);
          if (!result.ok) toast.error(result.error);
        })
      }
      className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function AddTaskForm() {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">Nieuwe taak</Label>
          <Input
            id="task-title"
            value={title}
            maxLength={80}
            placeholder="Examen statistiek leren"
            onChange={(e) => setTitle(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-due">Deadline (optioneel)</Label>
          <Input
            id="task-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-11"
          />
        </div>
        <Button
          className="h-11 w-full"
          disabled={pending || title.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await addTask(title.trim(), due || undefined);
              if (result.ok) {
                setTitle("");
                setDue("");
              } else toast.error(result.error);
            })
          }
        >
          Taak toevoegen
        </Button>
      </CardContent>
    </Card>
  );
}

function AddBlockForm({ today }: { today: string }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("12:00");
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="block-title">Nieuw blok</Label>
          <Input
            id="block-title"
            value={title}
            maxLength={80}
            placeholder="Les / werk / sport"
            onChange={(e) => setTitle(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-day">Dag</Label>
          <Input
            id="block-day"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="block-from">Van</Label>
            <Input
              id="block-from"
              type="time"
              step={900}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="block-to">Tot</Label>
            <Input
              id="block-to"
              type="time"
              step={900}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <Button
          className="h-11 w-full"
          disabled={pending || title.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await addBlock(title.trim(), day, from, to);
              if (result.ok) setTitle("");
              else toast.error(result.error);
            })
          }
        >
          Blok toevoegen
        </Button>
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
