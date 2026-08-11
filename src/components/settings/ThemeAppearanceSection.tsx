"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  THEME_PREFERENCE_LABELS,
  type ThemePreference,
} from "@/types/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: THEME_PREFERENCE_LABELS.light, icon: Sun },
  { value: "dark", label: THEME_PREFERENCE_LABELS.dark, icon: Moon },
  { value: "system", label: THEME_PREFERENCE_LABELS.system, icon: Monitor },
];

export function ThemeAppearanceSection() {
  const { preference, setPreference } = useTheme();

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="type-section-title font-sans text-sm tracking-tight text-foreground">
          Appearance
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Choose light, dark, or match your device&apos;s system theme.
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-0.5 rounded-xl border-[1.5px] border-border-green bg-elevated p-0.5"
        role="tablist"
        aria-label="Theme preference"
      >
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPreference(option.value)}
              className={`flex flex-col items-center gap-1 rounded-[0.65rem] px-2 py-2.5 text-xs font-normal transition-colors ${
                active
                  ? "bg-accent-green-muted text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
