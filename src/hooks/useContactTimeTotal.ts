"use client";

import { useCallback, useEffect, useState } from "react";
import { readApiJson } from "@/lib/api/read-json";

export function useContactTimeTotal(
  contactId: string | null,
  refreshToken = 0
) {
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contactId) {
      setTotalMinutes(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contactId}/time`, {
        cache: "no-store",
      });
      const data = await readApiJson<{
        totalMinutes?: number;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load time invested.");
      }

      setTotalMinutes(data.totalMinutes ?? 0);
    } catch (err) {
      setTotalMinutes(0);
      setError(
        err instanceof Error ? err.message : "Could not load time invested."
      );
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return { totalMinutes, isLoading, error };
}
