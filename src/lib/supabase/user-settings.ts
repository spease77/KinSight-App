import { createServerSupabase, humanizeSupabaseFetchError } from "@/lib/supabase/server";
import type { UserSettings } from "@/types/user-settings";

const SETTINGS_ROW_ID = "default";

type UserSettingsRow = {
  id: string;
  global_notifications_enabled: boolean;
};

function mapRow(row: UserSettingsRow): UserSettings {
  return {
    globalNotificationsEnabled: row.global_notifications_enabled,
  };
}

export async function fetchUserSettings(): Promise<{
  settings: UserSettings;
  error?: string;
}> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("user_settings")
      .select("id, global_notifications_enabled")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      if (error.message.includes("user_settings")) {
        return { settings: { globalNotificationsEnabled: true } };
      }
      return {
        settings: { globalNotificationsEnabled: true },
        error: humanizeSupabaseFetchError(error.message),
      };
    }

    if (!data) {
      return { settings: { globalNotificationsEnabled: true } };
    }

    return { settings: mapRow(data as UserSettingsRow) };
  } catch (err) {
    return {
      settings: { globalNotificationsEnabled: true },
      error: humanizeSupabaseFetchError(
        err instanceof Error ? err.message : "Could not load settings."
      ),
    };
  }
}

export async function updateUserSettings(
  patch: Partial<UserSettings>
): Promise<{ settings: UserSettings | null; error?: string }> {
  try {
    const supabase = createServerSupabase();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.globalNotificationsEnabled !== undefined) {
      updates.global_notifications_enabled = patch.globalNotificationsEnabled;
    }

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          id: SETTINGS_ROW_ID,
          ...updates,
        } as never,
        { onConflict: "id" }
      )
      .select("id, global_notifications_enabled")
      .single();

    if (error) {
      return { settings: null, error: error.message };
    }

    return { settings: mapRow(data as UserSettingsRow) };
  } catch (err) {
    return {
      settings: null,
      error: err instanceof Error ? err.message : "Could not save settings.",
    };
  }
}
