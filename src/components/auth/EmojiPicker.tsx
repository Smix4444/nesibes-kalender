"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const EMOJIS = ["🙂", "😎", "🥰", "🤩", "😇", "🦊", "🐼", "🌸", "🔥", "⚡", "🍀", "🧋"];

export function EmojiPicker() {
  const [selected, setSelected] = useState(EMOJIS[0]);

  return (
    <div className="space-y-1.5">
      <Label>Kies je emoji</Label>
      <input type="hidden" name="emoji" value={selected} />
      <div className="grid grid-cols-6 gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Kies ${emoji}`}
            aria-pressed={selected === emoji}
            onClick={() => setSelected(emoji)}
            className={cn(
              "flex size-11 items-center justify-center rounded-xl border text-xl transition-colors",
              selected === emoji
                ? "border-cig bg-cig/10"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
