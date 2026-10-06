import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COLOR_MEDIA,
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

const APPLE_STATUS_BAR_STYLE = "default";

export function syncThemeColorMeta(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference);
  const forcedColor = THEME_META_COLORS[effective];
  const existing = [...document.querySelectorAll('meta[name="theme-color"]')];

  if (preference === "system") {
    existing.forEach((node) => node.remove());
    THEME_COLOR_MEDIA.forEach(({ media, color }) => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", color);
      meta.setAttribute("media", media);
      document.head.appendChild(meta);
    });
  } else {
    existing.forEach((node, index) => {
      if (index === 0) {
        node.setAttribute("content", forcedColor);
        node.removeAttribute("media");
      } else {
        node.remove();
      }
    });

    if (existing.length === 0) {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", forcedColor);
      document.head.appendChild(meta);
    }
  }

  document.documentElement.style.backgroundColor = forcedColor;
}

function syncAppleStatusBarMeta(): void {
  const metas = document.querySelectorAll(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  metas.forEach((node, index) => {
    if (index === 0) {
      node.setAttribute("content", APPLE_STATUS_BAR_STYLE);
    } else {
      node.remove();
    }
  });

  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    meta.setAttribute("content", APPLE_STATUS_BAR_STYLE);
    document.head.appendChild(meta);
  }
}

export function applyThemeChrome(preference: ThemePreference): void {
  syncThemeColorMeta(preference);
  syncAppleStatusBarMeta();
}

export function updateThemeMetaColor(preference: ThemePreference): void {
  applyThemeChrome(preference);
}

/** Inline script to prevent theme flash before React hydrates. */
export const themeInitScript = `(() => {
  var light = ${JSON.stringify(THEME_META_COLORS.light)};
  var dark = ${JSON.stringify(THEME_META_COLORS.dark)};
  var mediaPairs = ${JSON.stringify([...THEME_COLOR_MEDIA])};

  function syncThemeColor(theme, effective) {
    var color = effective === "light" ? light : dark;
    var themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    if (theme === "system") {
      themeMetas.forEach(function(node) { node.remove(); });
      mediaPairs.forEach(function(pair) {
        var meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", pair.color);
        meta.setAttribute("media", pair.media);
        document.head.appendChild(meta);
      });
    } else {
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
    }
    document.documentElement.style.backgroundColor = color;
  }

  function syncThemeChrome() {
    try {
      var key = ${JSON.stringify(THEME_STORAGE_KEY)};
      var stored = localStorage.getItem(key);
      var allowed = ${JSON.stringify([...THEME_PREFERENCES])};
      var theme = allowed.indexOf(stored) !== -1 ? stored : ${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
      document.documentElement.setAttribute("data-theme", theme);
      var effective = theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
      syncThemeColor(theme, effective);
      var statusMetas = document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]');
      statusMetas.forEach(function(node, index) {
        if (index === 0) {
          node.setAttribute("content", "default");
        } else {
          node.remove();
        }
      });
      if (statusMetas.length === 0) {
        var statusMeta = document.createElement("meta");
        statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
        statusMeta.setAttribute("content", "default");
        document.head.appendChild(statusMeta);
      }
    } catch (e) {
      document.documentElement.setAttribute("data-theme", ${JSON.stringify(DEFAULT_THEME_PREFERENCE)});
    }
  }
  syncThemeChrome();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncThemeChrome);
  }
})();`;
