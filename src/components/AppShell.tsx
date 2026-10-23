"use client";

import { VoiceExperienceRoot } from "@/components/voice/VoiceExperienceRoot";
import { HomeSessionProvider } from "@/contexts/HomeSessionContext";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { useScrollChromeVisibility } from "@/hooks/useScrollChromeVisibility";
import { useViewportCalibration } from "@/hooks/useViewportCalibration";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardOpen();
  useScrollChromeVisibility();
  useViewportCalibration();

  return (
    <div
      id="app-frame"
      className="fixed left-0 right-0 top-0 z-0 overflow-hidden bg-background [transform:none] [filter:none] [contain:none]"
      // Fixed (not absolute) so the frame never adds scrollable overflow to the
      // document: when it was taller than iOS's short layout viewport, the page
      // could scroll a few px, which shifted content and made iOS draw a dark
      // scroll-edge fade over the top of the screen.
      // Top-anchored with the true screen height so a short or shifting iOS
      // layout viewport cannot cut the app off. 100% outside that case.
      style={{ height: "var(--kin-real-h, 100%)" }}
    >
      <HomeSessionProvider>
        <VoiceExperienceRoot>{children}</VoiceExperienceRoot>
      </HomeSessionProvider>
    </div>
  );
}
