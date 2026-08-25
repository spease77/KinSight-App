"use client";

import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <HomeSessionProvider>
      <VoiceExperienceRoot>
        <div className="app-shell mx-auto flex w-full max-w-lg flex-col overflow-hidden bg-background">
          <main className="app-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-[env(safe-area-inset-top)]">
            {children}
          </main>
        </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
