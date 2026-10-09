import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COLOR_MEDIA,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_KEY,
  THEME_META_COLORS,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/types/theme";

export function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function readCookieThemePreference(): ThemePreference | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${THEME_COOKIE_KEY}=`;
  const pairs = document.cookie.split("; ");
  for (const pair of pairs) {
    if (!pair.startsWith(prefix)) {
      continue;
    }

    try {
      const value = decodeURIComponent(pair.slice(prefix.length));
      if (isThemePreference(value)) {
        return value;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function readStoredThemePreference(): ThemePreference {
  // Cookies are shared between iOS Safari and Home Screen PWAs; localStorage is not.
  const fromCookie = readCookieThemePreference();
  if (fromCookie) {
    return fromCookie;
  }

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

export function persistThemePreferenceCookie(preference: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${THEME_COOKIE_KEY}=${encodeURIComponent(preference)}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function persistThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore write failures
  }

  persistThemePreferenceCookie(preference);
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

export function appleStatusBarStyleFor(
  effective: "light" | "dark"
): "default" | "black-translucent" {
  return effective === "light" ? "default" : "black-translucent";
}

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
  document.documentElement.style.colorScheme = effective;
}

function syncAppleStatusBarMeta(effective: "light" | "dark"): void {
  const style = appleStatusBarStyleFor(effective);
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

export function applyThemeChrome(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference);
  syncThemeColorMeta(preference);
  syncAppleStatusBarMeta(effective);
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
    document.documentElement.style.colorScheme = effective;
  }

  function syncThemeChrome() {
    try {
      var key = ${JSON.stringify(THEME_STORAGE_KEY)};
      var stored = null;
      try { stored = localStorage.getItem(key); } catch (storageErr) {}
      var cookieTheme = null;
      try {
        var prefix = key + "=";
        var pairs = document.cookie.split("; ");
        for (var i = 0; i < pairs.length; i++) {
          if (pairs[i].indexOf(prefix) === 0) {
            cookieTheme = decodeURIComponent(pairs[i].slice(prefix.length));
            break;
          }
        }
      } catch (cookieReadErr) {}
      var allowed = ${JSON.stringify([...THEME_PREFERENCES])};
      var theme = allowed.indexOf(cookieTheme) !== -1
        ? cookieTheme
        : (allowed.indexOf(stored) !== -1 ? stored : ${JSON.stringify(DEFAULT_THEME_PREFERENCE)});
      document.documentElement.setAttribute("data-theme", theme);
      var effective = theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
      try {
        document.cookie = ${JSON.stringify(THEME_COOKIE_KEY)} + "=" + encodeURIComponent(theme) + "; path=/; max-age=" + ${THEME_COOKIE_MAX_AGE_SECONDS} + "; samesite=lax";
      } catch (cookieErr) {}
      try { localStorage.setItem(key, theme); } catch (storageWriteErr) {}
      document.documentElement.style.colorScheme = effective;
      syncThemeColor(theme, effective);
      var statusBarStyle = effective === "light" ? "default" : "black-translucent";
      var statusMetas = document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]');
      statusMetas.forEach(function(node, index) {
        if (index === 0) {
          node.setAttribute("content", statusBarStyle);
        } else {
          node.remove();
        }
      });
      if (statusMetas.length === 0) {
        var statusMeta = document.createElement("meta");
        statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
        statusMeta.setAttribute("content", statusBarStyle);
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
