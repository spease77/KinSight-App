import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COLOR_MEDIA,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_KEY,
  APPLE_STATUS_BAR_STYLE,
  THEME_META_COLORS,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/types/theme";

/** Marks <meta> tags we created ourselves (the only ones we may remove). */
const OWN_META_ATTR = "data-kinsight-theme";

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
  _effective?: "light" | "dark"
): typeof APPLE_STATUS_BAR_STYLE {
  return APPLE_STATUS_BAR_STYLE;
}

export function syncThemeColorMeta(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference);
  const forcedColor = THEME_META_COLORS[effective];
  const all = [...document.querySelectorAll('meta[name="theme-color"]')];
  // Next.js/React own the <meta> tags it rendered. Removing them makes React
  // throw "removeChild" on the next route change, which aborts that navigation
  // (the URL changes but the old page stays until a second tap). Only ever
  // edit attributes on those; remove nothing but our own marked tags.
  const framework = all.filter((node) => !node.hasAttribute(OWN_META_ATTR));
  all
    .filter((node) => node.hasAttribute(OWN_META_ATTR))
    .forEach((node) => node.remove());

  if (framework.length > 0) {
    framework.forEach((node) => {
      const media = node.getAttribute("media") ?? "";
      if (preference === "system" && media.includes("prefers-color-scheme")) {
        node.setAttribute(
          "content",
          media.includes("dark") ? THEME_META_COLORS.dark : THEME_META_COLORS.light
        );
      } else {
        node.setAttribute("content", forcedColor);
        if (preference !== "system") node.removeAttribute("media");
      }
    });
  } else if (preference === "system") {
    THEME_COLOR_MEDIA.forEach(({ media, color }) => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", color);
      meta.setAttribute("media", media);
      meta.setAttribute(OWN_META_ATTR, "");
      document.head.appendChild(meta);
    });
  } else {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", forcedColor);
    meta.setAttribute(OWN_META_ATTR, "");
    document.head.appendChild(meta);
  }

  paintDocumentTheme(forcedColor, effective);
}

export function paintDocumentTheme(
  color: string,
  effective: "light" | "dark"
): void {
  const root = document.documentElement;
  root.style.backgroundColor = color;
  root.style.colorScheme = effective;
  root.style.setProperty("--bg-main", color);
  root.style.setProperty("--background", color);
  if (document.body) {
    document.body.style.backgroundColor = color;
    document.body.style.colorScheme = effective;
  }
}

function syncAppleStatusBarMeta(_effective?: "light" | "dark"): void {
  const style = appleStatusBarStyleFor();
  const metas = document.querySelectorAll(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  metas.forEach((node) => {
    node.setAttribute("content", style);
  });

  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    meta.setAttribute("content", style);
    meta.setAttribute(OWN_META_ATTR, "");
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
  var ownAttr = ${JSON.stringify(OWN_META_ATTR)};
  if (window.navigator.standalone) {
    document.documentElement.classList.add("pwa-standalone");
  }

  function syncThemeColor(theme, effective) {
    var color = effective === "light" ? light : dark;
    // Never remove tags Next/React rendered: that makes React throw on the next
    // route change and aborts the navigation. Edit attributes only.
    var themeMetas = Array.prototype.slice.call(document.querySelectorAll('meta[name="theme-color"]'));
    var frameworkMetas = themeMetas.filter(function(node) { return !node.hasAttribute(ownAttr); });
    themeMetas.forEach(function(node) { if (node.hasAttribute(ownAttr)) node.remove(); });
    if (frameworkMetas.length > 0) {
      frameworkMetas.forEach(function(node) {
        var media = node.getAttribute("media") || "";
        if (theme === "system" && media.indexOf("prefers-color-scheme") !== -1) {
          node.setAttribute("content", media.indexOf("dark") !== -1 ? dark : light);
        } else {
          node.setAttribute("content", color);
          if (theme !== "system") node.removeAttribute("media");
        }
      });
    } else if (theme === "system") {
      mediaPairs.forEach(function(pair) {
        var meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", pair.color);
        meta.setAttribute("media", pair.media);
        meta.setAttribute(ownAttr, "");
        document.head.appendChild(meta);
      });
    } else {
      var themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      themeMeta.setAttribute("content", color);
      themeMeta.setAttribute(ownAttr, "");
      document.head.appendChild(themeMeta);
    }
    document.documentElement.style.backgroundColor = color;
    document.documentElement.style.colorScheme = effective;
    document.documentElement.style.setProperty("--bg-main", color);
    document.documentElement.style.setProperty("--background", color);
    if (document.body) {
      document.body.style.backgroundColor = color;
      document.body.style.colorScheme = effective;
    }
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
      var statusBarStyle = ${JSON.stringify(APPLE_STATUS_BAR_STYLE)};
      var statusMetas = document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]');
      statusMetas.forEach(function(node) {
        node.setAttribute("content", statusBarStyle);
      });
      if (statusMetas.length === 0) {
        var statusMeta = document.createElement("meta");
        statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
        statusMeta.setAttribute("content", statusBarStyle);
        statusMeta.setAttribute(ownAttr, "");
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
