"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Check, Link2, Unlink } from "lucide-react";
import { readApiJson } from "@/lib/api/read-json";
import { ensureCalendarDeviceId } from "@/lib/calendar/device-id-client";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import type { CalendarStatusResponse } from "@/types/calendar-connection";

function emptyStatus(): CalendarStatusResponse {
  return {
    signedIn: false,
    googleRedirectUri:
      "https://kin-sight-app.vercel.app/api/calendar/google/callback",
    outlookRedirectUri:
      "https://kin-sight-app.vercel.app/api/calendar/outlook/callback",
    google: {
      provider: "google",
      configured: false,
      connected: false,
      accountEmail: null,
    },
    outlook: {
      provider: "outlook",
      configured: false,
      connected: false,
      accountEmail: null,
    },
  };
}

export function CalendarIntegrationsSection() {
  const [status, setStatus] = useState<CalendarStatusResponse>(emptyStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState<
    "google" | "outlook" | null
  >(null);

  const loadStatus = useCallback(async () => {
    try {
      // Makes sure this install's device id cookie exists before asking the server.
      ensureCalendarDeviceId();
      const res = await fetch("/api/calendar/status", { cache: "no-store" });
      const data = await readApiJson<CalendarStatusResponse>(res);
      setStatus({
        signedIn: Boolean(data.signedIn),
        googleRedirectUri:
          data.googleRedirectUri || emptyStatus().googleRedirectUri,
        outlookRedirectUri:
          data.outlookRedirectUri || emptyStatus().outlookRedirectUri,
        google: data.google ?? emptyStatus().google,
        outlook: data.outlook ?? emptyStatus().outlook,
      });
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not load calendar connections."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    // Connecting happens in a Safari sheet on iPhone; re-check when the app is
    // shown again so the card flips to "Connected" without a manual refresh.
    const handleVisible = () => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
    };
  }, [loadStatus]);

  const handleConnectGoogle = useCallback(() => {
    const device = ensureCalendarDeviceId();
    window.location.href = `/api/calendar/google/connect?device=${encodeURIComponent(device)}`;
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    if (!window.confirm("Disconnect Google Calendar from this KinSight account?")) {
      return;
    }

    setIsDisconnecting("google");
    try {
      const res = await fetch("/api/calendar/google/disconnect", {
        method: "POST",
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Could not disconnect Google Calendar.");
      }
      showSuccessToast("Google Calendar disconnected.");
      await loadStatus();
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not disconnect Google Calendar."
      );
    } finally {
      setIsDisconnecting(null);
    }
  }, [loadStatus]);

  const handleConnectOutlook = useCallback(() => {
    const device = ensureCalendarDeviceId();
    window.location.href = `/api/calendar/outlook/connect?device=${encodeURIComponent(device)}`;
  }, []);

  const handleDisconnectOutlook = useCallback(async () => {
    if (!window.confirm("Disconnect Outlook Calendar from this KinSight account?")) {
      return;
    }

    setIsDisconnecting("outlook");
    try {
      const res = await fetch("/api/calendar/outlook/disconnect", {
        method: "POST",
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Could not disconnect Outlook Calendar.");
      }
      showSuccessToast("Outlook Calendar disconnected.");
      await loadStatus();
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not disconnect Outlook Calendar."
      );
    } finally {
      setIsDisconnecting(null);
    }
  }, [loadStatus]);

  const google = status.google;
  const googleReady = google.configured && !google.setupRequired;
  const outlook = status.outlook;
  const outlookReady = outlook.configured && !outlook.setupRequired;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="type-section-title font-sans text-sm tracking-tight text-foreground">
          Integrations
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Connect Google or Outlook. Their events appear in the Agenda, and
          meetings you add in KinSight are created on the connected calendar.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="rounded-lg border border-[#4285F4]/35 bg-[#4285F4]/10 px-3.5 py-3.5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70">
              <Calendar className="h-4 w-4 text-foreground" strokeWidth={2} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Google Calendar
                </p>
                {google.connected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-green-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-green-bright">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                    Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {google.connected && google.accountEmail
                  ? `Syncing as ${google.accountEmail}`
                  : "See your Google events in KinSight and add KinSight meetings to your Gmail calendar. No password is stored — Google OAuth only."}
              </p>

              {isLoading ? (
                <p className="mt-3 text-xs text-muted">Checking connection…</p>
              ) : google.setupRequired ? (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Run <code>019_calendar_connections.sql</code> in the Supabase
                  SQL editor, then refresh.
                </p>
              ) : !google.configured ? (
                <GoogleCalendarSetupSteps
                  redirectUri={status.googleRedirectUri}
                />
              ) : !status.signedIn && !google.connected ? (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs leading-relaxed text-muted">
                    Sign in with Google to connect your own Gmail calendar. No
                    password is stored.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={!googleReady}
                    className="ui-btn-green inline-flex items-center gap-2 px-3 py-2 text-xs shadow-none"
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Connect Google Calendar
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={!googleReady}
                    className={
                      google.connected
                        ? "inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                        : "ui-btn-green inline-flex items-center gap-2 px-3 py-2 text-xs shadow-none"
                    }
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    {google.connected ? "Reconnect" : "Connect Google Calendar"}
                  </button>
                  {google.connected && (
                    <button
                      type="button"
                      onClick={() => void handleDisconnectGoogle()}
                      disabled={isDisconnecting === "google"}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      <Unlink className="h-3.5 w-3.5" strokeWidth={2} />
                      {isDisconnecting === "google"
                        ? "Disconnecting…"
                        : "Disconnect"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#0078D4]/35 bg-[#0078D4]/10 px-3.5 py-3.5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70">
              <Calendar className="h-4 w-4 text-foreground" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Outlook Calendar
                </p>
                {outlook.connected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-green-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-green-bright">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                    Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {outlook.connected && outlook.accountEmail
                  ? `Syncing as ${outlook.accountEmail}`
                  : "See your Outlook events in KinSight and add KinSight meetings to that calendar. No password is stored — Microsoft OAuth only."}
              </p>

              {isLoading ? (
                <p className="mt-3 text-xs text-muted">Checking connection…</p>
              ) : outlook.setupRequired ? (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Run <code>019_calendar_connections.sql</code> in the Supabase
                  SQL editor, then refresh.
                </p>
              ) : !outlook.configured ? (
                <OutlookCalendarSetupSteps
                  redirectUri={status.outlookRedirectUri}
                />
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleConnectOutlook}
                    disabled={!outlookReady}
                    className={
                      outlook.connected
                        ? "inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                        : "ui-btn-green inline-flex items-center gap-2 px-3 py-2 text-xs shadow-none"
                    }
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    {outlook.connected
                      ? "Reconnect"
                      : "Connect Outlook Calendar"}
                  </button>
                  {outlook.connected && (
                    <button
                      type="button"
                      onClick={() => void handleDisconnectOutlook()}
                      disabled={isDisconnecting === "outlook"}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      <Unlink className="h-3.5 w-3.5" strokeWidth={2} />
                      {isDisconnecting === "outlook"
                        ? "Disconnecting…"
                        : "Disconnect"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleCalendarSetupSteps({ redirectUri }: { redirectUri: string }) {
  return (
    <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
      <p>
        Connect is one free Google Cloud step away. Google does not let an app
        use your Gmail calendar until you create an OAuth client (no password
        is stored).
      </p>
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>
          Open{" "}
          <a
            href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Google Cloud Console
          </a>
          , create a project, and enable <strong>Google Calendar API</strong>.
        </li>
        <li>
          OAuth consent screen: External, Testing. Add your Gmail as a test
          user.
        </li>
        <li>
          Credentials → Create OAuth client → Web application. Redirect URI:
          <code className="mt-1 block break-all rounded-md bg-card/80 px-2 py-1 text-[11px] text-foreground">
            {redirectUri}
          </code>
        </li>
        <li>
          In Vercel → Settings → Environment Variables, add{" "}
          <code>GOOGLE_CALENDAR_CLIENT_ID</code> and{" "}
          <code>GOOGLE_CALENDAR_CLIENT_SECRET</code>, then Redeploy.
        </li>
        <li>
          Run <code>019_calendar_connections.sql</code> and{" "}
          <code>021_calendar_events_sync.sql</code> in the Supabase SQL editor
          if you have not already.
        </li>
      </ol>
      <p>After that, this card will show Connect Google Calendar.</p>
    </div>
  );
}

function OutlookCalendarSetupSteps({ redirectUri }: { redirectUri: string }) {
  return (
    <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
      <p>
        Connect is one Microsoft Entra step away. Outlook does not let an app
        edit your calendar until you create an app registration (no password is
        stored).
      </p>
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>
          Open{" "}
          <a
            href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Azure App registrations
          </a>
          , create a registration, and choose accounts in any org directory and
          personal Microsoft accounts.
        </li>
        <li>
          Authentication → Add a platform → Web. Redirect URI:
          <code className="mt-1 block break-all rounded-md bg-card/80 px-2 py-1 text-[11px] text-foreground">
            {redirectUri}
          </code>
        </li>
        <li>
          Certificates & secrets → New client secret. Copy the value.
        </li>
        <li>
          API permissions → Microsoft Graph → Delegated:{" "}
          <code>Calendars.ReadWrite</code>, <code>offline_access</code>,{" "}
          <code>User.Read</code>.
        </li>
        <li>
          In Vercel → Settings → Environment Variables, add{" "}
          <code>OUTLOOK_CALENDAR_CLIENT_ID</code> and{" "}
          <code>OUTLOOK_CALENDAR_CLIENT_SECRET</code>, then Redeploy.
        </li>
        <li>
          Run <code>019_calendar_connections.sql</code> and{" "}
          <code>021_calendar_events_sync.sql</code> in the Supabase SQL editor
          if you have not already.
        </li>
      </ol>
      <p>After that, this card will show Connect Outlook Calendar.</p>
    </div>
  );
}
