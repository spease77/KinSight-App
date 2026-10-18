"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Check, Link2, Unlink } from "lucide-react";
import { readApiJson } from "@/lib/api/read-json";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import type { CalendarStatusResponse } from "@/types/calendar-connection";

function emptyStatus(): CalendarStatusResponse {
  return {
    signedIn: false,
    googleRedirectUri:
      "https://kin-sight-app.vercel.app/api/calendar/google/callback",
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
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/status", { cache: "no-store" });
      const data = await readApiJson<CalendarStatusResponse>(res);
      setStatus({
        signedIn: Boolean(data.signedIn),
        googleRedirectUri:
          data.googleRedirectUri || emptyStatus().googleRedirectUri,
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
  }, [loadStatus]);

  const handleConnectGoogle = useCallback(() => {
    window.location.href = "/api/calendar/google/connect";
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    if (!window.confirm("Disconnect Google Calendar from this KinSight account?")) {
      return;
    }

    setIsDisconnecting(true);
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
      setIsDisconnecting(false);
    }
  }, [loadStatus]);

  const google = status.google;
  const googleReady = google.configured && !google.setupRequired;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="type-section-title font-sans text-sm tracking-tight text-foreground">
          Integrations
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Connect your Gmail calendar for free. Meetings you push from KinSight
          are created on that Google account.
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
                  : "Add meetings from KinSight onto your Gmail calendar. No password is stored — Google OAuth only."}
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
                      disabled={isDisconnecting}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      <Unlink className="h-3.5 w-3.5" strokeWidth={2} />
                      {isDisconnecting ? "Disconnecting…" : "Disconnect"}
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
              <p className="text-sm font-medium text-foreground">
                Outlook Calendar
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Outlook sync is coming soon. Use Google Calendar to test invites
                today.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs font-medium text-muted opacity-60"
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                Coming soon
              </button>
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
          Run <code>019_calendar_connections.sql</code> in the Supabase SQL
          editor if you have not already.
        </li>
      </ol>
      <p>After that, this card will show Connect Google Calendar.</p>
    </div>
  );
}
