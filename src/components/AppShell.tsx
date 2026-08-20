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
        <div className="app-viewport fixed inset-0 mx-auto flex w-full max-w-lg flex-col overflow-hidden bg-main">
          <main className="app-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-auto">
            {children}
          </main>
        </div>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
