"use client";

import { useEffect, useState } from "react";

export function useAppForeground(): boolean {
  const [isForeground, setIsForeground] = useState(true);

  useEffect(() => {
    const sync = () => {
      setIsForeground(document.visibilityState === "visible" && document.hasFocus());
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("pagehide", sync);

    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("pagehide", sync);
    };
  }, []);

  return isForeground;
}
