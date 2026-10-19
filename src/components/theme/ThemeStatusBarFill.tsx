"use client";

/** Paints the iOS Home Screen status-bar inset with the active theme color. */
export function ThemeStatusBarFill({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      className="theme-status-fill"
      style={{ backgroundColor: color }}
    />
  );
}
