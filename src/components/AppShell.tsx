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
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
      <HomeSessionProvider>
        <VoiceExperienceRoot>{children}</VoiceExperienceRoot>
      </HomeSessionProvider>
    </div>
  );
}
