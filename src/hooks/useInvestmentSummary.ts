"use client";

import { useCallback, useEffect, useState } from "react";
import type { InvestmentContactSummary } from "@/types/time-log";
import { readApiJson } from "@/lib/api/read-json";

export function useInvestmentSummary(refreshToken = 0) {
  const [contacts, setContacts] = useState<InvestmentContactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/time-logs/summary", { cache: "no-store" });
      const data = await readApiJson<{
        contacts?: InvestmentContactSummary[];
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load time logs.");
      }

      setContacts(data.contacts ?? []);
    } catch (err) {
      setContacts([]);
      setError(err instanceof Error ? err.message : "Could not load time logs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch, refreshToken]);

  return { contacts, isLoading, error, refetch };
}
