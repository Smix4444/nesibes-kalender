"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "Systeem" },
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            "min-h-11 rounded-xl border text-sm font-semibold transition-colors",
            theme === option.value ? "border-cig bg-cig/10 text-cig" : "border-border bg-card",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
