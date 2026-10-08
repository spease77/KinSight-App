export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export const THEME_STORAGE_KEY = "kinsight-theme-preference";

/** Cookie name mirrors localStorage key for SSR theme-color / data-theme. */
export const THEME_COOKIE_KEY = THEME_STORAGE_KEY;

export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const THEME_META_COLORS: Record<"light" | "dark", string> = {
  light: "#ffffff",
  dark: "#000000",
};

export const THEME_COLOR_MEDIA: ReadonlyArray<{
  media: string;
  color: string;
}> = [
  { media: "(prefers-color-scheme: light)", color: THEME_META_COLORS.light },
  { media: "(prefers-color-scheme: dark)", color: THEME_META_COLORS.dark },
];
