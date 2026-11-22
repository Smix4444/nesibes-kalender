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
  /** teller-badge, bv. open aanvragen voor Nesibe */
  count?: number;
};

export function BottomNav({ role, inboxCount = 0 }: { role: AppRole; inboxCount?: number }) {
  const pathname = usePathname();
  const isOwner = role === "owner";

  // Nesibe heeft geen ideeën-tab nodig (die staan op haar Home) maar wel haar inbox.
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {left.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="flex justify-center">
          <Link
            href="/new"
            aria-label="Nieuwe afspraak"
            className="-mt-5 flex size-14 items-center justify-center rounded-full bg-linear-to-br from-cig-2 to-cig text-white shadow-lg shadow-cig/30 transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Link>
        </div>

        {right.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
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
        "relative flex min-h-11 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors",
        active ? "text-cig" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
      {item.label}
      {item.count ? (
        <span className="absolute top-1 right-1/2 translate-x-4 rounded-full bg-cig px-1.5 text-[10px] leading-4 font-bold text-white">
          {item.count > 9 ? "9+" : item.count}
        </span>
      ) : null}
    </Link>
  );
}
