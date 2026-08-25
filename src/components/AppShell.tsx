"use client";

import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardOpen();

  return (
    <HomeSessionProvider>
      <VoiceExperienceRoot>{children}</VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
