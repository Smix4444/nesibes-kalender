import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Sectiekop in redactionele stijl: klein gespatieerd labeltje met een
 * haarlijn die de rest van de breedte opvult.
 */
export function Section({
  label,
  action,
  actionHref,
  children,
  className,
}: {
  label: string;
  action?: string;
  actionHref?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <h2 className="label-eyebrow shrink-0">{label}</h2>
        <span className="h-px flex-1 bg-border" aria-hidden />
        {action && actionHref ? (
          <Link
            href={actionHref}
            className="shrink-0 text-xs font-semibold text-cig transition-opacity active:opacity-60"
          >
            {action}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
