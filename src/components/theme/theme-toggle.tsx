"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ compact = true }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-bg-sunken p-0.5",
        compact ? "h-8" : "h-9",
      )}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setPreference(option.value)}
            className={cn(
              "relative flex h-7 items-center justify-center rounded-[5px] text-faint transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease)] hover:text-text",
              compact ? "w-7" : "gap-1.5 px-2.5",
              selected && "bg-surface text-text shadow-[var(--shadow-sm)]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 transition-transform duration-[var(--duration)] ease-[var(--ease)]",
                selected && "scale-110",
              )}
            />
            {compact ? null : <span className="text-xs font-medium">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
