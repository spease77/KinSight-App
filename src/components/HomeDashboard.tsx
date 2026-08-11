"use client";

import { Dashboard } from "@/components/Dashboard";
import { useHomeSession } from "@/contexts/HomeSessionContext";

export function HomeDashboard() {
  const homeSession = useHomeSession();

  return <Dashboard key={homeSession} homeSession={homeSession} />;
}
