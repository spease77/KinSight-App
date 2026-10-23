"use client";

const STORAGE_KEY = "kinsight-device-id";
const COOKIE_NAME = "kinsight_device";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(): string | null {
  const prefix = `${COOKIE_NAME}=`;
  for (const pair of document.cookie.split("; ")) {
    if (pair.startsWith(prefix)) {
      return decodeURIComponent(pair.slice(prefix.length));
    }
  }
  return null;
}

function generateId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Returns this install's calendar device id, creating it on first use, and
 * (re)writes it as a first-party cookie so every API call carries it.
 */
export function ensureCalendarDeviceId(): string {
  let id: string | null = null;

  try {
    id = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    id = null;
  }

  id = id || readCookie() || generateId();

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore storage failures; the cookie still works
  }

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${
    window.location.protocol === "https:" ? "; secure" : ""
  }`;

  return id;
}
