import {
  DEFAULT_THEME_PREFERENCE,
  THEME_META_COLORS,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/types/theme";

export function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isThemePreference(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable in private mode
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function persistThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore write failures
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  document.documentElement.setAttribute("data-theme", preference);
  updateThemeMetaColor(preference);
}

export function resolveEffectiveTheme(
  preference: ThemePreference
): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function updateThemeMetaColor(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference);
  const color = THEME_META_COLORS[effective];

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", color);
}

/** Inline script to prevent theme flash before React hydrates. */
export const themeInitScript = `(() => {
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var stored = localStorage.getItem(key);
    var allowed = ${JSON.stringify([...THEME_PREFERENCES])};
    var theme = allowed.indexOf(stored) !== -1 ? stored : ${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
    document.documentElement.setAttribute("data-theme", theme);
    var dark = ${JSON.stringify(THEME_META_COLORS.dark)};
    var light = ${JSON.stringify(THEME_META_COLORS.light)};
    var effective = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", effective === "light" ? light : dark);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", ${JSON.stringify(DEFAULT_THEME_PREFERENCE)});
  }
})();`;
