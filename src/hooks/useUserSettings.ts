"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserSettings } from "@/types/user-settings";
import { readApiJson } from "@/lib/api/read-json";

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    globalNotificationsEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await readApiJson<{
        settings?: UserSettings;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load settings.");
      }

      setSettings(data.settings ?? { globalNotificationsEnabled: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateGlobalNotifications = useCallback(
    async (enabled: boolean) => {
      setIsSaving(true);
      setError(null);

      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ globalNotificationsEnabled: enabled }),
        });

        const data = await readApiJson<{
          settings?: UserSettings;
          error?: string;
        }>(res);

        if (!res.ok) {
          throw new Error(data.error ?? "Could not save settings.");
        }

        setSettings(data.settings ?? { globalNotificationsEnabled: enabled });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not save settings."
        );
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    settings,
    isLoading,
    isSaving,
    error,
    reload: loadSettings,
    updateGlobalNotifications,
  };
}
