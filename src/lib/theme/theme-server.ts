import { cookies } from "next/headers";
import type { Viewport } from "next";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COLOR_MEDIA,
  THEME_META_COLORS,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/types/theme";
import { isThemePreference } from "@/lib/theme/theme";

export async function getServerThemePreference(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(THEME_STORAGE_KEY)?.value;

  if (raw && isThemePreference(raw)) {
    return raw;
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function getViewportThemeColor(
  preference: ThemePreference
): NonNullable<Viewport["themeColor"]> {
  if (preference === "light") {
    return THEME_META_COLORS.light;
  }

  if (preference === "dark") {
    return THEME_META_COLORS.dark;
  }

  return [...THEME_COLOR_MEDIA];
}

export function getServerThemeChromeColor(
  preference: ThemePreference
): string | undefined {
  if (preference === "light") {
    return THEME_META_COLORS.light;
  }

  if (preference === "dark") {
    return THEME_META_COLORS.dark;
  }

  return undefined;
}

export function getServerAppleStatusBarStyle(
  preference: ThemePreference
): "default" | "black-translucent" {
  return preference === "light" ? "default" : "black-translucent";
}
