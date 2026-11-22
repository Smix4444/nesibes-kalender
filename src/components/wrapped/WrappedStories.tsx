"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { categoryMeta } from "@/lib/categories";
import { COIN_EMOJI } from "@/lib/config";
import { cn } from "@/lib/utils";

type Slide = {
  gradient: string;
  emoji: string;
  big: string;
  label: string;
  sub?: string;
};

const SLIDE_MS = 5000;

function buildSlides(data: Record<string, unknown>, name: string): Slide[] {
  const num = (key: string) => Number(data[key] ?? 0);
  const str = (key: string) => (data[key] ? String(data[key]) : null);
  const isOwner = Boolean(data.is_owner);

  const slides: Slide[] = [
    {
      gradient: "from-cig to-cig-2",
      emoji: "🎁",
      big: String(data.period ?? ""),
      label: `De maand van ${name}`,
      sub: "Tik om verder te gaan",
    },
    {
      gradient: "from-[#5C7AEA] to-[#9B5DE5]",
      emoji: "📅",
      big: String(num("appointments")),
      label: isOwner ? "afspraken met vrienden" : "afspraken met Nesibe",
    },
    {
      gradient: "from-[#2BB673] to-[#00BBF9]",
      emoji: "⏱️",
      big: `${data.hours_with_nesibe ?? data.hours ?? 0}u`,
      label: "samen doorgebracht",
    },
  ];

  const topCategory = str("top_category");
  if (topCategory) {
    const meta = categoryMeta(topCategory);
    slides.push({
      gradient: "from-[#F4A259] to-[#E4572E]",
      emoji: meta.emoji,
      big: meta.label,
      label: "jullie favoriete bezigheid",
    });
  }

  const topLocation = str("top_location");
  if (topLocation) {
    slides.push({
      gradient: "from-[#6A994E] to-[#2BB673]",
      emoji: "📍",
      big: topLocation,
      label: "de vaste stek",
    });
  }

  if (isOwner) {
    const friends = Array.isArray(data.top_friends)
      ? (data.top_friends as { name: string; hours: number }[])
      : [];
    if (friends.length) {
      slides.push({
        gradient: "from-[#F7D774] to-[#D4A017]",
        emoji: "🥇",
        big: friends[0].name,
        label: "je trouwste gezelschap",
        sub: friends
          .slice(1)
          .map((f, i) => `${i + 2}. ${f.name}`)
          .join(" · "),
      });
    }
    slides.push({
      gradient: "from-cig to-[#9B5DE5]",
      emoji: COIN_EMOJI,
      big: String(num("coins_earned")),
      label: "çiğköftes verdiend aan veilingen",
      sub: str("most_generous") ? `Gulste bieder: ${str("most_generous")}` : undefined,
    });
  } else {
    slides.push({
      gradient: "from-cig to-[#9B5DE5]",
      emoji: COIN_EMOJI,
      big: String(num("coins_spent")),
      label: "çiğköftes uitgegeven",
      sub: `${num("auctions_won")} veiling(en) gewonnen`,
    });
    slides.push({
      gradient: "from-[#3D5A80] to-[#5C7AEA]",
      emoji: "🏆",
      big: `#${num("rank_hours")}`,
      label: `van de ${num("total_friends")} vrienden`,
    });
  }

  if (num("photos") > 0) {
    slides.push({
      gradient: "from-[#FF8FAB] to-[#C86FC9]",
      emoji: "📸",
      big: String(num("photos")),
      label: "foto's gedeeld",
    });
  }

  slides.push({
    gradient: "from-cig-2 to-cig",
    emoji: "🫶",
    big: "Tot volgende maand!",
    label: str("fun_line") ?? "Op naar nog meer çiğköfte-momenten",
  });

  return slides;
}

export function WrappedStories({
  data,
  name,
}: {
  data: Record<string, unknown>;
  name: string;
}) {
  const slides = buildSlides(data, name);
  const [index, setIndex] = useState(0);
  const card = useRef<HTMLDivElement>(null);

  // Automatisch doorschuiven, net als een story.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1 < slides.length ? i + 1 : i));
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, slides.length]);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  async function share() {
    if (!card.current) return;
    try {
      const dataUrl = await toPng(card.current, { pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `nesiplan-wrapped.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mijn NesiPlan Wrapped" });
        return;
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "nesiplan-wrapped.png";
      link.click();
      toast.success("Opgeslagen 📥");
    } catch {
      toast.error("Delen lukte niet");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1" role="progressbar" aria-valuenow={index + 1} aria-valuemax={slides.length}>
        {slides.map((_, i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-cig" : "bg-muted")}
          />
        ))}
      </div>

      <div className="relative">
        <div
          ref={card}
          className={cn(
            "flex min-h-[26rem] flex-col items-center justify-center gap-3 rounded-3xl bg-linear-to-br p-8 text-center text-white",
            slide.gradient,
          )}
        >
          <span className="text-5xl" aria-hidden>
            {slide.emoji}
          </span>
          <p className="font-heading text-4xl leading-tight font-extrabold break-words">
            {slide.big}
          </p>
          <p className="text-base font-medium text-white/90">{slide.label}</p>
          {slide.sub ? <p className="text-sm text-white/75">{slide.sub}</p> : null}
        </div>

        {/* Tikzones links/rechts, net als bij stories. */}
        <button
          type="button"
          aria-label="Vorige"
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        />
        <button
          type="button"
          aria-label="Volgende"
          className="absolute inset-y-0 right-0 w-1/3"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
        />
      </div>

      {isLast ? (
        <Button className="h-12 w-full font-bold" onClick={share}>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <>
              <Share2 className="size-4" /> Deel je Wrapped
            </>
          ) : (
            <>
              <Download className="size-4" /> Bewaar als afbeelding
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}
