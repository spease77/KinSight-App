"use client";

import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { useScrollChromeVisibility } from "@/hooks/useScrollChromeVisibility";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardOpen();
  useScrollChromeVisibility();

  return (
    <div
      id="app-frame"
      className="absolute inset-0 z-0 overflow-hidden bg-background"
    >
      <HomeSessionProvider>
        <VoiceExperienceRoot>{children}</VoiceExperienceRoot>
      </HomeSessionProvider>
    </div>
  );
}
