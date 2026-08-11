"use client";

import { Mic } from "lucide-react";
import type { VoiceOverlayPhase, VoiceSessionSource } from "@/contexts/VoiceExperienceContext";

interface VoiceOverlayProps {
  phase: VoiceOverlayPhase;
  sessionSource: VoiceSessionSource | null;
  isRecording?: boolean;
  isTranscribing?: boolean;
  onDismiss?: () => void;
}

const SOURCE_LABELS: Record<VoiceSessionSource, string> = {
  os_shortcut: "Voice shortcut",
};

export function VoiceOverlay({
  phase,
  sessionSource,
  isRecording = false,
  isTranscribing = false,
  onDismiss,
}: VoiceOverlayProps) {
  if (phase === "hidden") return null;

  const label = sessionSource ? SOURCE_LABELS[sessionSource] : "Listening";
  const statusText = isTranscribing
    ? "Processing your request…"
    : isRecording
      ? "Listening…"
      : "Ready when you are";

  const micActive = isRecording || phase === "listening";

  return (
    <div
      className="voice-overlay fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="KinSight voice session"
      onClick={() => {
        if (!isRecording && !isTranscribing) onDismiss?.();
      }}
    >
      <div
        className="voice-overlay-panel relative flex w-full max-w-sm flex-col items-center gap-5 overflow-hidden rounded-3xl border border-white/20 bg-white/10 px-6 py-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/30"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-green-bright/10 via-transparent to-white/5"
          aria-hidden="true"
        />

        <p className="type-meta relative text-foreground/90">{label}</p>

        <div className="relative flex h-36 w-36 items-center justify-center">
          <span
            className={`voice-overlay-ring absolute inset-0 rounded-full border border-accent-green-bright/50 ${
              micActive ? "voice-overlay-ring--active" : ""
            }`}
            aria-hidden="true"
          />
          <span
            className={`voice-overlay-ring voice-overlay-ring--delay absolute inset-2 rounded-full border border-accent-green-bright/30 ${
              micActive ? "voice-overlay-ring--active" : ""
            }`}
            aria-hidden="true"
          />
          <div
            className={`relative flex h-24 w-24 items-center justify-center rounded-full border border-white/25 bg-white/15 shadow-inner backdrop-blur-md ${
              micActive ? "voice-overlay-mic--pulse" : ""
            }`}
          >
            <Mic className="h-10 w-10 text-foreground" strokeWidth={2} />
          </div>
        </div>

        <div className="relative">
          <p className="font-sans text-lg text-foreground">{statusText}</p>
          <p className="mt-1 text-sm text-muted">
            Shortcut received — KinSight is handling your request.
          </p>
        </div>
      </div>
    </div>
  );
}
