"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { OsVoiceLaunchPayload, OsVoiceSource } from "@/lib/voice/os-voice-deeplink";
import { triggerVoiceHaptic } from "@/lib/voice/haptics";

export type VoiceSessionSource = "os_shortcut";

export type VoiceOverlayPhase = "hidden" | "listening" | "processing";

export type VoicePipelineHandlers = {
  beginRecording: () => Promise<void> | void;
  toggleRecording: () => void;
  submitTextCommand: (text: string, source?: OsVoiceSource) => Promise<void> | void;
};

type VoiceExperienceContextValue = {
  overlayPhase: VoiceOverlayPhase;
  sessionSource: VoiceSessionSource | null;
  registerVoiceHandlers: (handlers: VoicePipelineHandlers | null) => void;
  openVoiceOverlay: (source: VoiceSessionSource) => void;
  closeVoiceOverlay: () => void;
  handleOsVoiceLaunch: (payload: OsVoiceLaunchPayload) => void;
  flushPendingVoiceStart: () => void;
  pipelineActivity: { isRecording: boolean; isTranscribing: boolean };
  syncPipelineActivity: (activity: {
    isRecording: boolean;
    isTranscribing: boolean;
  }) => void;
};

const VoiceExperienceContext = createContext<VoiceExperienceContextValue | null>(
  null
);

export function VoiceExperienceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const handlersRef = useRef<VoicePipelineHandlers | null>(null);
  const osLaunchHandledRef = useRef<string | null>(null);
  const pendingVoiceStartRef = useRef(false);

  const [overlayPhase, setOverlayPhase] = useState<VoiceOverlayPhase>("hidden");
  const [sessionSource, setSessionSource] = useState<VoiceSessionSource | null>(
    null
  );
  const [pipelineActivity, setPipelineActivity] = useState({
    isRecording: false,
    isTranscribing: false,
  });

  const syncPipelineActivity = useCallback(
    (activity: { isRecording: boolean; isTranscribing: boolean }) => {
      setPipelineActivity(activity);
      setOverlayPhase((current) => {
        if (activity.isTranscribing) return "processing";
        if (activity.isRecording && current !== "hidden") return "listening";
        if (!activity.isRecording && !activity.isTranscribing && current === "processing") {
          return "hidden";
        }
        if (!activity.isRecording && !activity.isTranscribing && current === "listening") {
          return "hidden";
        }
        return current;
      });
      if (!activity.isRecording && !activity.isTranscribing) {
        setSessionSource(null);
      }
    },
    []
  );

  const registerVoiceHandlers = useCallback(
    (handlers: VoicePipelineHandlers | null) => {
      handlersRef.current = handlers;
    },
    []
  );

  const openVoiceOverlay = useCallback((source: VoiceSessionSource) => {
    setSessionSource(source);
    setOverlayPhase("listening");
  }, []);

  const closeVoiceOverlay = useCallback(() => {
    setOverlayPhase("hidden");
    setSessionSource(null);
  }, []);

  const flushPendingVoiceStart = useCallback(() => {
    if (!pendingVoiceStartRef.current) return;
    pendingVoiceStartRef.current = false;
    void handlersRef.current?.beginRecording();
  }, []);

  const runPipeline = useCallback(
    async (payload: OsVoiceLaunchPayload, source: VoiceSessionSource) => {
      const handlers = handlersRef.current;
      if (!handlers) {
        pendingVoiceStartRef.current = true;
        router.push("/");
        return;
      }

      openVoiceOverlay(source);
      await triggerVoiceHaptic("wake");

      if (payload.command?.trim()) {
        setOverlayPhase("processing");
        await handlers.submitTextCommand(payload.command.trim(), payload.source);
        closeVoiceOverlay();
        return;
      }

      await handlers.beginRecording();
    },
    [closeVoiceOverlay, openVoiceOverlay, router]
  );

  const handleOsVoiceLaunch = useCallback(
    (payload: OsVoiceLaunchPayload) => {
      const fingerprint = JSON.stringify(payload);
      if (osLaunchHandledRef.current === fingerprint) return;
      osLaunchHandledRef.current = fingerprint;

      void runPipeline(payload, "os_shortcut");
    },
    [runPipeline]
  );

  const value = useMemo(
    () => ({
      overlayPhase,
      sessionSource,
      registerVoiceHandlers,
      openVoiceOverlay,
      closeVoiceOverlay,
      handleOsVoiceLaunch,
      flushPendingVoiceStart,
      pipelineActivity,
      syncPipelineActivity,
    }),
    [
      overlayPhase,
      sessionSource,
      registerVoiceHandlers,
      openVoiceOverlay,
      closeVoiceOverlay,
      handleOsVoiceLaunch,
      flushPendingVoiceStart,
      pipelineActivity,
      syncPipelineActivity,
    ]
  );

  return (
    <VoiceExperienceContext.Provider value={value}>
      {children}
    </VoiceExperienceContext.Provider>
  );
}

export function useVoiceExperience(): VoiceExperienceContextValue {
  const context = useContext(VoiceExperienceContext);
  if (!context) {
    throw new Error("useVoiceExperience must be used within VoiceExperienceProvider");
  }
  return context;
}
