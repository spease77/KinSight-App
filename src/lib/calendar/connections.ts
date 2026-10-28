import {
  createServiceRoleSupabase,
  humanizeSupabaseFetchError,
} from "@/lib/supabase/server";
import {
  fetchGoogleAccountEmail,
  refreshGoogleAccessToken,
} from "@/lib/calendar/google-oauth";
import {
  fetchOutlookAccountEmail,
  refreshOutlookAccessToken,
} from "@/lib/calendar/outlook-oauth";
import type { CalendarProvider } from "@/types/calendar-connection";

export type CalendarConnectionRow = {
  user_id: string;
  provider: CalendarProvider;
  account_email: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  connected_at: string;
  updated_at: string;
};

const CONNECTION_SELECT =
  "user_id, provider, account_email, access_token, refresh_token, token_expires_at, scope, connected_at, updated_at";

export function isCalendarConnectionsTableMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("calendar_connections") &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("relation"))
  );
}

export async function getCalendarConnection(
  userId: string,
  provider: CalendarProvider
): Promise<{
  connection: CalendarConnectionRow | null;
  error?: string;
  setupRequired?: boolean;
}> {
  try {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("calendar_connections")
      .select(CONNECTION_SELECT)
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    if (error) {
      if (isCalendarConnectionsTableMissing(error.message)) {
        return {
          connection: null,
          setupRequired: true,
          error:
            "Calendar connections are not set up yet — run migration 019_calendar_connections.sql in the Supabase SQL editor.",
        };
      }

      return {
        connection: null,
        error: humanizeSupabaseFetchError(error.message),
      };
    }

    return { connection: (data as CalendarConnectionRow | null) ?? null };
  } catch (err) {
    return {
      connection: null,
      error: humanizeSupabaseFetchError(
        err instanceof Error ? err.message : "Could not load calendar connection."
      ),
    };
  }
}

export async function upsertCalendarConnection(input: {
  userId: string;
  provider: CalendarProvider;
  accountEmail?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
}): Promise<{ error?: string; setupRequired?: boolean }> {
  try {
    const existing = await getCalendarConnection(input.userId, input.provider);
    if (existing.setupRequired) {
      return { error: existing.error, setupRequired: true };
    }

    const supabase = createServiceRoleSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase.from("calendar_connections").upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        account_email:
          input.accountEmail ?? existing.connection?.account_email ?? null,
        access_token: input.accessToken,
        refresh_token:
          input.refreshToken ?? existing.connection?.refresh_token ?? null,
        token_expires_at: input.expiresAt ?? null,
        scope: input.scope ?? existing.connection?.scope ?? null,
        connected_at: existing.connection?.connected_at ?? now,
        updated_at: now,
      } as never,
      { onConflict: "user_id,provider" }
    );

    if (error) {
      if (isCalendarConnectionsTableMissing(error.message)) {
        return {
          setupRequired: true,
          error:
            "Calendar connections are not set up yet — run migration 019_calendar_connections.sql in the Supabase SQL editor.",
        };
      }
      return { error: humanizeSupabaseFetchError(error.message) };
    }

    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not save calendar connection.",
    };
  }
}

export async function deleteCalendarConnection(
  userId: string,
  provider: CalendarProvider
): Promise<{ error?: string; setupRequired?: boolean }> {
  try {
    const supabase = createServiceRoleSupabase();
    const { error } = await supabase
      .from("calendar_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) {
      if (isCalendarConnectionsTableMissing(error.message)) {
        return {
          setupRequired: true,
          error:
            "Calendar connections are not set up yet — run migration 019_calendar_connections.sql in the Supabase SQL editor.",
        };
      }
      return { error: humanizeSupabaseFetchError(error.message) };
    }

    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not disconnect calendar.",
    };
  }
}

type ValidAccessToken = {
  accessToken?: string;
  accountEmail?: string | null;
  error?: string;
  setupRequired?: boolean;
  connected: boolean;
  needsReauth?: boolean;
};

export async function getValidGoogleAccessToken(
  userId: string
): Promise<ValidAccessToken> {
  return getValidProviderAccessToken(userId, "google");
}

export async function getValidOutlookAccessToken(
  userId: string
): Promise<ValidAccessToken> {
  return getValidProviderAccessToken(userId, "outlook");
}

export async function hasOtherCalendarConnection(
  userId: string,
  besides: CalendarProvider
): Promise<boolean> {
  const other: CalendarProvider = besides === "google" ? "outlook" : "google";
  const { connection } = await getCalendarConnection(userId, other);
  return Boolean(connection);
}

async function getValidProviderAccessToken(
  userId: string,
  provider: CalendarProvider
): Promise<ValidAccessToken> {
  const { connection, error, setupRequired } = await getCalendarConnection(
    userId,
    provider
  );

  const label = provider === "google" ? "Google Calendar" : "Outlook Calendar";

  if (setupRequired) {
    return { connected: false, setupRequired, error };
  }

  if (error) {
    return { connected: false, error };
  }

  if (!connection) {
    return { connected: false };
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;
  const stillValid = expiresAt - Date.now() > 60_000;

  if (stillValid && connection.access_token) {
    return {
      connected: true,
      accessToken: connection.access_token,
      accountEmail: connection.account_email,
    };
  }

  if (!connection.refresh_token) {
    return {
      connected: true,
      needsReauth: true,
      error: `${label} needs to be reconnected — the saved session has no refresh token.`,
    };
  }

  try {
    const tokens =
      provider === "google"
        ? await refreshGoogleAccessToken(connection.refresh_token)
        : await refreshOutlookAccessToken(connection.refresh_token);
    const accountEmail =
      connection.account_email ??
      (provider === "google"
        ? await fetchGoogleAccountEmail(tokens.accessToken)
        : await fetchOutlookAccountEmail(tokens.accessToken));

    await upsertCalendarConnection({
      userId,
      provider,
      accountEmail,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    return {
      connected: true,
      accessToken: tokens.accessToken,
      accountEmail,
    };
  } catch (err) {
    return {
      connected: true,
      needsReauth: true,
      error:
        err instanceof Error
          ? err.message
          : `Could not refresh ${label} access.`,
    };
  }
}
