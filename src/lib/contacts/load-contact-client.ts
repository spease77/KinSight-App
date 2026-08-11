import { readApiJson } from "@/lib/api/read-json";
import type { ContactDetail } from "@/types/contact";

export const CONTACT_LOAD_TIMEOUT_MS = 12_000;

export type ContactLoadResult = {
  contact: ContactDetail | null;
  error: string | null;
};

export async function loadContactById(
  id: string,
  options?: { timeoutMs?: number }
): Promise<ContactLoadResult> {
  const timeoutMs = options?.timeoutMs ?? CONTACT_LOAD_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/contacts/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await readApiJson<{
      contact?: ContactDetail;
      error?: string;
    }>(res);

    if (!res.ok) {
      return { contact: null, error: data.error ?? "Contact not found" };
    }

    return { contact: data.contact ?? null, error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        contact: null,
        error: "Request timed out. The server may be busy — try again.",
      };
    }

    if (err instanceof Error) {
      return { contact: null, error: err.message };
    }

    return {
      contact: null,
      error: "Could not load contact. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
