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
        <div className="app-shell hotel-texture relative mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-main">
          <main className="app-scroll no-scrollbar relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none pb-24">
            {children}
          </main>
          <BottomNav />
        </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
