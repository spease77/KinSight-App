"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

function providerLabel(provider: string | null): string {
  return provider === "outlook" ? "Outlook Calendar" : "Google Calendar";
}

function errorMessage(provider: string | null, reason: string): string {
  const label = providerLabel(provider);
  const messages: Record<string, string> = {
    sign_in: `Connect ${label} from Settings to continue.`,
    denied: `${label} access was declined.`,
    invalid_state: `${label} connect expired. Try again from Settings.`,
    not_configured: `${label} is not configured yet. Add the OAuth client ID and secret in Vercel.`,
    missing_code: `${label} did not return an authorization code. Try connecting again.`,
    token_exchange: `Could not finish ${label} connect. Try again.`,
    setup:
      "Run migration 019_calendar_connections.sql in the Supabase SQL editor, then reconnect.",
    save: `Could not save your ${label} connection. Try again.`,
  };
  return messages[reason] ?? `Could not connect ${label}.`;
}

export function CalendarOAuthReturn() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (!calendar) return;

    const provider = searchParams.get("provider");
    const label = providerLabel(provider);

    if (calendar === "connected") {
      showSuccessToast(
        `${label} connected. New meetings can sync to that calendar.`
      );
    } else if (calendar === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      showErrorToast(errorMessage(provider, reason));
    }

    const next = new URLSearchParams(searchParams);
    next.delete("calendar");
    next.delete("reason");
    next.delete("provider");
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
