"use client";

import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { BottomNav } from "@/components/BottomNav";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <HomeSessionProvider>
      <VoiceExperienceRoot>
        <div className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-background">
          <main className="app-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[env(safe-area-inset-top)]">
            {children}
          </main>
          <BottomNav />
        </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
