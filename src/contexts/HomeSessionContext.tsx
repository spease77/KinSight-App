"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const HomeSessionContext = createContext(0);

export function HomeSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const [homeSession, setHomeSession] = useState(0);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const returnedToHomeTab =
      pathname === "/" && previousPath !== null && previousPath !== "/";

    previousPathRef.current = pathname;

    if (returnedToHomeTab) {
      setHomeSession((current) => current + 1);
    }
  }, [pathname]);

  return (
    <HomeSessionContext.Provider value={homeSession}>
      {children}
    </HomeSessionContext.Provider>
  );
}

export function useHomeSession(): number {
  return useContext(HomeSessionContext);
}
