"use client";

import { useSyncExternalStore } from "react";

function getHeaderSlot(): HTMLElement | null {
  return document.getElementById("home-header-slot");
}

function subscribe(): () => void {
  return () => {};
}

/** Resolves #home-header-slot synchronously on the client (no layout-effect flash). */
export function useHomeHeaderSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribe, getHeaderSlot, () => null);
}
