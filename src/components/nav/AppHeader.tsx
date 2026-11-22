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
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/" className="font-heading text-lg font-extrabold tracking-tight">
          {title ?? (
            <>
              Nesi<span className="text-cig">Plan</span>
            </>
          )}
        </Link>

        <Link
          href="/notifications"
          aria-label={
            unreadCount > 0 ? `Meldingen, ${unreadCount} ongelezen` : "Meldingen"
          }
          className="relative flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-cig px-1 text-[10px] leading-4 font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
