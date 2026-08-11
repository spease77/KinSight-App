"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { Contact } from "@/types/contact";
import { readApiJson } from "@/lib/api/read-json";

const LOAD_TIMEOUT_MS = 15_000;

type ContactsContextValue = {
  contacts: Contact[];
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  upsertContact: (contact: Contact) => void;
  removeContact: (contactId: string) => void;
};

const ContactsContext = createContext<ContactsContextValue | null>(null);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

    try {
      const res = await fetch("/api/contacts", {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readApiJson<{
        contacts?: Contact[];
        error?: string;
      }>(res);

      if (requestId !== requestIdRef.current) return;

      setContacts(data.contacts ?? []);
      setError(data.error ?? null);
      hasLoadedRef.current = true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setContacts([]);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Loading contacts timed out. Try again.");
      } else {
        setError(
          err instanceof Error ? err.message : "Could not load contacts."
        );
      }
    } finally {
      clearTimeout(timeout);
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const upsertContact = useCallback((contact: Contact) => {
    setContacts((current) => {
      const index = current.findIndex((item) => item.id === contact.id);
      if (index >= 0) {
        const next = [...current];
        next[index] = { ...next[index], ...contact };
        return next;
      }
      return [contact, ...current];
    });
  }, []);

  const removeContact = useCallback((contactId: string) => {
    setContacts((current) =>
      current.filter((contact) => contact.id !== contactId)
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (pathname === "/contacts" && hasLoadedRef.current) {
      void reload();
    }
  }, [pathname, reload]);

  return (
    <ContactsContext.Provider
      value={{ contacts, error, isLoading, reload, upsertContact, removeContact }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts(): ContactsContextValue {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error("useContacts must be used within ContactsProvider");
  }
  return context;
}
