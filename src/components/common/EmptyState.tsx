import type { ReactNode } from "react";

/**
 * Lege staat zonder gestippeld kader: een groot zacht teken, een korte
 * tekst en eventueel een actie.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span
        className="font-heading text-5xl leading-none opacity-20 select-none"
        aria-hidden
      >
        {icon}
      </span>
      <p className="font-heading text-base font-bold">{title}</p>
      {children ? (
        <p className="max-w-[28ch] text-sm leading-relaxed text-muted-foreground">{children}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
