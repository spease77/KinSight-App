"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadContactById,
  type ContactLoadResult,
} from "@/lib/contacts/load-contact-client";
import type { ContactDetail } from "@/types/contact";

export function useContactLoader(id: string) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadRequestRef = useRef(0);

  const applyResult = useCallback((result: ContactLoadResult) => {
    setContact(result.contact);
    setError(result.error);
  }, []);

  const refreshContact = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setError(null);

    const result = await loadContactById(id);
    if (requestId !== loadRequestRef.current) return result;

    applyResult(result);
    setIsLoading(false);
    return result;
  }, [applyResult, id]);

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);

      const result = await loadContactById(id);
      if (cancelled || requestId !== loadRequestRef.current) return;

      applyResult(result);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyResult, id]);

  return {
    contact,
    setContact,
    error,
    isLoading,
    refreshContact,
  };
}
