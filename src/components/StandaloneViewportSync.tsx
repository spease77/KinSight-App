"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    __kinsightSyncStandaloneViewport?: () => void;
  }
}

/** Re-sync standalone viewport height after client navigations and hydration. */
export function StandaloneViewportSync() {
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => window.__kinsightSyncStandaloneViewport?.();
    sync();
    const t1 = window.setTimeout(sync, 100);
    const t2 = window.setTimeout(sync, 350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
