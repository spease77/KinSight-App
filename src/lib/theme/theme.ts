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

const APPLE_STATUS_BAR_STYLES: Record<"light" | "dark", string> = {
  light: "default",
  dark: "black-translucent",
};

export function syncThemeColorMeta(color: string): void {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((node, index) => {
    if (index === 0) {
      node.setAttribute("content", color);
      node.removeAttribute("media");
    } else {
      node.remove();
    }
  });

  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", color);
    document.head.appendChild(meta);
  }
}

function syncAppleStatusBarMeta(style: string): void {
  const metas = document.querySelectorAll(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  metas.forEach((node, index) => {
    if (index === 0) {
      node.setAttribute("content", style);
    } else {
      node.remove();
    }
  });

  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    meta.setAttribute("content", style);
    document.head.appendChild(meta);
  }
}

export function applyThemeChrome(effective: "light" | "dark"): void {
  const color = THEME_META_COLORS[effective];
  syncThemeColorMeta(color);
  syncAppleStatusBarMeta(APPLE_STATUS_BAR_STYLES[effective]);
  document.documentElement.style.backgroundColor = color;
}

export function updateThemeMetaColor(preference: ThemePreference): void {
  applyThemeChrome(resolveEffectiveTheme(preference));
}

/** Inline script to prevent theme flash before React hydrates. */
export const themeInitScript = `(() => {
  function syncThemeChrome() {
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
      var color = effective === "light" ? light : dark;
      var themeMetas = document.querySelectorAll('meta[name="theme-color"]');
      themeMetas.forEach(function(node, index) {
        if (index === 0) {
          node.setAttribute("content", color);
          node.removeAttribute("media");
        } else {
          node.remove();
        }
      });
      if (themeMetas.length === 0) {
        var themeMeta = document.createElement("meta");
        themeMeta.setAttribute("name", "theme-color");
        themeMeta.setAttribute("content", color);
        document.head.appendChild(themeMeta);
      }
      var statusStyle = effective === "light" ? "default" : "black-translucent";
      var statusMetas = document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]');
      statusMetas.forEach(function(node, index) {
        if (index === 0) {
          node.setAttribute("content", statusStyle);
        } else {
          node.remove();
        }
      });
      if (statusMetas.length === 0) {
        var statusMeta = document.createElement("meta");
        statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
        statusMeta.setAttribute("content", statusStyle);
        document.head.appendChild(statusMeta);
      }
      document.documentElement.style.backgroundColor = color;
    } catch (e) {
      document.documentElement.setAttribute("data-theme", ${JSON.stringify(DEFAULT_THEME_PREFERENCE)});
    }
  }
  syncThemeChrome();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncThemeChrome);
  }
})();`;
