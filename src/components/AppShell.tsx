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
        <div className="app-viewport mx-auto flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden bg-main">
          <main className="app-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-auto pb-24">
            {children}
          </main>
          <BottomNav />
        </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
