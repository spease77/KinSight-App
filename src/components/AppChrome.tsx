"use client";

import { BottomNav } from "@/components/BottomNav";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

/** Global chrome: keyboard tracking + bottom nav (single mount, all pages). */
export function AppChrome() {
  useKeyboardOpen();

  return <BottomNav />;
}
