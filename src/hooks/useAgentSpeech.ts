"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/ai/message-text";
import {
  hasPendingSpeechPlayback,
  replayPendingSpeech,
  speakText,
  stopSpeaking,
  unlockSpeechSynthesis,
  type SpeakResult,
} from "@/lib/audio/speech";

const SPEECH_ENABLED_KEY = "kinsight-speech-enabled";

function readInitialSpeechEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SPEECH_ENABLED_KEY) !== "false";
}

export function useAgentSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const speakingRef = useRef(false);
  const speechPrefHydratedRef = useRef(false);

  useEffect(() => {
    setSpeechEnabled(readInitialSpeechEnabled());
    speechPrefHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!speechPrefHydratedRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(
      SPEECH_ENABLED_KEY,
      speechEnabled ? "true" : "false"
    );
  }, [speechEnabled]);

  const finishSpeech = useCallback((result: SpeakResult) => {
    speakingRef.current = false;
    setIsSpeaking(false);

    if (result.ok) {
      setPlaybackBlocked(false);
      setSpeechError(null);
      return;
    }

    if (result.reason === "autoplay_blocked" && hasPendingSpeechPlayback()) {
      setPlaybackBlocked(true);
      setSpeechError(null);
      return;
    }

    if (result.reason === "api_error") {
      setSpeechError(
        "KinSight couldn't play the voice reply. Check your connection or try again."
      );
    }

    setPlaybackBlocked(false);
  }, []);

  const speakAssistantReply = useCallback(
    async (allMessages: UIMessage[]) => {
      if (!speechEnabled || speakingRef.current) return;

      const lastAssistant = [...allMessages]
        .reverse()
        .find((m) => m.role === "assistant");

      if (!lastAssistant) return;

      const text = getMessageText(lastAssistant).trim();
      if (!text) return;

      if (lastAssistant.id === lastSpokenIdRef.current) return;

      unlockSpeechSynthesis();
      speakingRef.current = true;
      setIsSpeaking(true);
      setPlaybackBlocked(false);
      setSpeechError(null);

      const result = await speakText(text);
      if (result.ok) {
        lastSpokenIdRef.current = lastAssistant.id;
      }
      finishSpeech(result);
    },
    [finishSpeech, speechEnabled]
  );

  const replayBlockedSpeech = useCallback(async () => {
    if (!hasPendingSpeechPlayback()) return;

    unlockSpeechSynthesis();
    speakingRef.current = true;
    setIsSpeaking(true);
    setPlaybackBlocked(false);
    setSpeechError(null);

    const result = await replayPendingSpeech();
    finishSpeech(result);
  }, [finishSpeech]);

  const interruptSpeech = useCallback(() => {
    stopSpeaking();
    speakingRef.current = false;
    setIsSpeaking(false);
    setPlaybackBlocked(false);
    setSpeechError(null);
  }, []);

  const toggleSpeechEnabled = useCallback(() => {
    setSpeechEnabled((prev) => {
      if (prev) interruptSpeech();
      return !prev;
    });
  }, [interruptSpeech]);

  return {
    isSpeaking,
    speechEnabled,
    playbackBlocked,
    speechError,
    speakAssistantReply,
    replayBlockedSpeech,
    interruptSpeech,
    toggleSpeechEnabled,
  };
}
