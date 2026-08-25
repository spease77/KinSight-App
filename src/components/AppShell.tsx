"use client";

import { BottomNav } from "@/components/BottomNav";
import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellFrame({ children }: AppShellProps) {
  useKeyboardOpen();

  return (
    <div className="app-shell mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-background">
      <main className="app-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-20 pt-[env(safe-area-inset-top)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <HomeSessionProvider>
      <VoiceExperienceRoot>
        <AppShellFrame>{children}</AppShellFrame>
      </VoiceExperienceRoot>
    </HomeSessionProvider>
  );
}
