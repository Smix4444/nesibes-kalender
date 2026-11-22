"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Inbox, Lightbulb, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/config";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  count?: number;
};

export function BottomNav({ role, inboxCount = 0 }: { role: AppRole; inboxCount?: number }) {
  const pathname = usePathname();
  const isOwner = role === "owner";

  // Nesibe heeft geen ideeen-tab nodig (die staan op haar Home) maar wel haar inbox.
  const third: NavItem = isOwner
    ? { href: "/inbox", label: "Inbox", icon: Inbox, count: inboxCount }
    : { href: "/ideas", label: "Ideeën", icon: Lightbulb };

  const left: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
  ];
  const right: NavItem[] = [third, { href: "/profile", label: "Profiel", icon: User }];

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-safe"
    >
      <div className="mx-auto w-full max-w-md px-4 pb-3">
        <div className="pointer-events-auto relative flex items-center justify-between rounded-full border border-border/70 bg-card/85 px-2 py-1.5 shadow-warm-lg backdrop-blur-xl">
          {left.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          {/* De plusknop steekt bewust boven de balk uit. */}
          <Link
            href="/new"
            aria-label="Nieuwe afspraak"
            className="group relative -mt-7 flex size-14 shrink-0 items-center justify-center rounded-full bg-cig text-white shadow-warm-md ring-4 ring-background transition-transform duration-200 active:scale-90"
          >
            <Plus className="size-6 transition-transform duration-200 group-active:rotate-90" strokeWidth={2.75} />
          </Link>

          {right.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-semibold tracking-tight transition-colors duration-200",
        active ? "text-cig" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} />
        {item.count ? (
          <span className="absolute -top-1 -right-2 min-w-[17px] rounded-full bg-cig px-1 text-[10px] leading-[17px] font-bold text-white shadow-warm-sm">
            {item.count > 9 ? "9+" : item.count}
          </span>
        ) : null}
      </span>
      {item.label}
      {/* Puntje i.p.v. een hele actieve achtergrond: rustiger. */}
      <span
        className={cn(
          "absolute -bottom-0.5 size-1 rounded-full bg-cig transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
    </Link>
  );
}
