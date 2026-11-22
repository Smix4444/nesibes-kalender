import Link from "next/link";
import { Bell } from "lucide-react";

export function AppHeader({
  title,
  unreadCount = 0,
}: {
  title?: string;
  unreadCount?: number;
}) {
  return (
    <header className="sticky top-0 z-30 pt-safe">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <Link href="/" className="group flex items-center gap-2">
            {/* Het çiğköfte-ovaal als woordmerk-accent. */}
            <span
              className="size-2.5 rotate-[-20deg] rounded-full bg-cig transition-transform duration-300 group-active:scale-90"
              aria-hidden
            />
            <span className="font-heading text-[17px] font-extrabold tracking-tight">
              {title ?? "NesiPlan"}
            </span>
          </Link>

          <Link
            href="/notifications"
            aria-label={unreadCount > 0 ? `Meldingen, ${unreadCount} ongelezen` : "Meldingen"}
            className="relative -mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-muted"
          >
            <Bell className="size-[19px]" strokeWidth={1.9} />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-cig ring-2 ring-background" />
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
