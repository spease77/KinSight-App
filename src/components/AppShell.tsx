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
        <div className="app-shell hotel-texture relative mx-auto flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] max-w-lg flex-col overflow-hidden">
        <div className="app-scroll no-scrollbar relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(var(--bottom-nav-height,4.75rem)+var(--safe-bottom,env(safe-area-inset-bottom,0px)))]">
          {children}
        </div>

        <BottomNav />
      </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
