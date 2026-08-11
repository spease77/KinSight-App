"use client";

import { useCallback, useState } from "react";
import { Calendar, Check, Link2 } from "lucide-react";

type CalendarProvider = "google" | "outlook";

type ConnectionState = Record<CalendarProvider, boolean>;

const PROVIDERS: {
  id: CalendarProvider;
  name: string;
  description: string;
  connectLabel: string;
  accentClass: string;
}[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Import and sync meetings from your Google account.",
    connectLabel: "Connect Google Calendar",
    accentClass: "border-[#4285F4]/35 bg-[#4285F4]/10",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Import and sync meetings from Microsoft Outlook.",
    connectLabel: "Connect Outlook",
    accentClass: "border-[#0078D4]/35 bg-[#0078D4]/10",
  },
];

export function CalendarIntegrationsSection() {
  const [connections, setConnections] = useState<ConnectionState>({
    google: false,
    outlook: false,
  });

  const handleConnect = useCallback((provider: CalendarProvider) => {
    const label = provider === "google" ? "Google Calendar" : "Outlook";

    window.alert(
      `${label} sync is coming soon. OAuth and Nylas integration will be wired in a future release.`
    );

    setConnections((current) => ({
      ...current,
      [provider]: true,
    }));
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="type-section-title font-sans text-sm tracking-tight text-foreground">
          Integrations
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Connect external calendars for two-way sync. OAuth setup arrives in a
          later release.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {PROVIDERS.map((provider) => {
          const connected = connections[provider.id];

          return (
            <div
              key={provider.id}
              className={`rounded-lg border px-3.5 py-3.5 ${provider.accentClass}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70">
                  <Calendar className="h-4 w-4 text-foreground" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {provider.name}
                    </p>
                    {connected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-green-bright">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {provider.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleConnect(provider.id)}
                    className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      connected
                        ? "border border-border/70 bg-card/80 text-muted hover:text-foreground"
                        : "ui-btn-green px-3 py-2 text-xs shadow-none"
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    {connected ? "Reconnect" : provider.connectLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
