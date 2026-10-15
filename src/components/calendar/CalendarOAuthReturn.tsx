"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

const ERROR_MESSAGES: Record<string, string> = {
  sign_in: "Connect Google Calendar from Settings to continue.",
  denied: "Google Calendar access was declined.",
  invalid_state: "Google Calendar connect expired. Try again from Settings.",
  not_configured:
    "Google Calendar is not configured yet. Add the free OAuth client ID and secret in Vercel.",
  missing_code: "Google did not return an authorization code. Try connecting again.",
  token_exchange: "Could not finish Google Calendar connect. Try again.",
  setup:
    "Run migration 019_calendar_connections.sql in the Supabase SQL editor, then reconnect.",
  save: "Could not save your Google Calendar connection. Try again.",
};

export function CalendarOAuthReturn() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (!calendar) return;

    if (calendar === "connected") {
      showSuccessToast("Google Calendar connected. New meetings can sync to your Gmail calendar.");
    } else if (calendar === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      showErrorToast(ERROR_MESSAGES[reason] ?? "Could not connect Google Calendar.");
    }

    const next = new URLSearchParams(searchParams);
    next.delete("calendar");
    next.delete("reason");
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
