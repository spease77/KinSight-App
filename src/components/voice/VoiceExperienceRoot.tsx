"use client";

import { Suspense } from "react";
import { VoiceExperienceProvider, useVoiceExperience } from "@/contexts/VoiceExperienceContext";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import { CalendarOAuthReturn } from "@/components/calendar/CalendarOAuthReturn";
import { useOsVoiceLaunch } from "@/hooks/useOsVoiceLaunch";

function VoiceExperienceRuntime() {
  const {
    overlayPhase,
    sessionSource,
    closeVoiceOverlay,
    pipelineActivity,
  } = useVoiceExperience();

  useOsVoiceLaunch();

  return (
    <>
      <CalendarOAuthReturn />
      <VoiceOverlay
        phase={overlayPhase}
        sessionSource={sessionSource}
        isRecording={pipelineActivity.isRecording}
        isTranscribing={pipelineActivity.isTranscribing}
        onDismiss={closeVoiceOverlay}
      />
    </>
  );
}

export function VoiceExperienceRoot({ children }: { children: React.ReactNode }) {
  return (
    <VoiceExperienceProvider>
      {children}
      <Suspense fallback={null}>
        <VoiceExperienceRuntime />
      </Suspense>
    </VoiceExperienceProvider>
  );
}
