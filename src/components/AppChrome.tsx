"use client";

import { BottomNav } from "@/components/BottomNav";
import { useBottomNavPin } from "@/hooks/useBottomNavPin";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

/** Global chrome: keyboard tracking + pinned bottom nav (single mount, all pages). */
export function AppChrome() {
  useBottomNavPin();
  useKeyboardOpen();

  return <BottomNav />;
}
