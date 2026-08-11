export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export const THEME_STORAGE_KEY = "kinsight-theme-preference";

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const THEME_META_COLORS: Record<"light" | "dark", string> = {
  light: "#f7f8f8",
  dark: "#121214",
};
