"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveEffectiveTheme,
} from "@/lib/theme/theme";
import {
  DEFAULT_THEME_PREFERENCE,
  type ThemePreference,
} from "@/types/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  effectiveTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE
  );
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPreferenceState(readStoredThemePreference());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    applyThemePreference(preference);
    persistThemePreference(preference);
    setEffectiveTheme(resolveEffectiveTheme(preference));
  }, [preference, ready]);

  useEffect(() => {
    if (!ready || preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      applyThemePreference("system");
      setEffectiveTheme(resolveEffectiveTheme("system"));
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference, ready]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      effectiveTheme,
      setPreference,
    }),
    [preference, effectiveTheme, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
