"use client";

import { BottomNav } from "@/components/BottomNav";
import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <HomeSessionProvider>
      <VoiceExperienceRoot>
        <div className="app-shell hotel-texture relative mx-auto min-h-dvh max-w-lg">
        <div className="app-bottom-glow" aria-hidden="true" />

        <div className="relative z-10 overflow-x-hidden pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
          {children}
        </div>

        <BottomNav />
      </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
