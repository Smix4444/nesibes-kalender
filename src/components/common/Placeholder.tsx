import type { ReactNode } from "react";

/**
 * Tijdelijke vulling voor schermen die in een latere bouwfase komen.
 * Wordt per fase vervangen door het echte scherm.
 */
export function Placeholder({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h1 className="font-heading text-xl font-extrabold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {children ?? "Dit scherm wordt in een volgende bouwfase ingevuld."}
      </p>
    </section>
  );
}
