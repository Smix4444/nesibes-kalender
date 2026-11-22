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
    <div className="flex flex-col items-center gap-1.5 px-6 py-7 text-center">
      <span
        className="font-heading text-[28px] leading-none opacity-25 select-none"
        aria-hidden
      >
        {icon}
      </span>
      <p className="font-heading text-[15px] font-bold">{title}</p>
      {children ? (
        <p className="max-w-[30ch] text-[13px] leading-snug text-muted-foreground">{children}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
