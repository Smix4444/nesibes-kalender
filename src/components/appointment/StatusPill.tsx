import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["appt_status"];

const STATUS: Record<Status, { label: string; emoji: string; className: string }> = {
  pending: { label: "Wacht op Nesibe", emoji: "⏳", className: "bg-warning/15 text-warning" },
  countered: { label: "Tegenvoorstel", emoji: "🔁", className: "bg-cig-2/15 text-cig-2" },
  auction: { label: "Veiling", emoji: "⚔️", className: "bg-cig/15 text-cig" },
  accepted: { label: "Bevestigd", emoji: "✅", className: "bg-success/15 text-success" },
  declined: { label: "Geweigerd", emoji: "❌", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Geannuleerd", emoji: "🚫", className: "bg-muted text-muted-foreground" },
  expired: { label: "Verlopen", emoji: "⌛", className: "bg-muted text-muted-foreground" },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        meta.className,
        className,
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
