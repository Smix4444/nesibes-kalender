import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["appt_status"];

const STATUS: Record<Status, { label: string; className: string; dot: string }> = {
  pending:   { label: "Wacht op Nesibe", className: "text-warning",         dot: "bg-warning" },
  countered: { label: "Tegenvoorstel",   className: "text-cig-2",           dot: "bg-cig-2" },
  auction:   { label: "Veiling",         className: "text-cig",             dot: "bg-cig" },
  accepted:  { label: "Bevestigd",       className: "text-success",         dot: "bg-success" },
  declined:  { label: "Geweigerd",       className: "text-muted-foreground", dot: "bg-muted-foreground" },
  cancelled: { label: "Geannuleerd",     className: "text-muted-foreground", dot: "bg-muted-foreground" },
  expired:   { label: "Verlopen",        className: "text-muted-foreground", dot: "bg-muted-foreground" },
};

/** Status als klein stipje met tekst — rustiger dan een gekleurde badge. */
export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
