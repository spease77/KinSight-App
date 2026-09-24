"use client";

import { useCallback, useRef, useState } from "react";
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

export function useAgentSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);
  const speakingRef = useRef(false);

  const finishSpeech = useCallback((result: SpeakResult) => {
    speakingRef.current = false;
    setIsSpeaking(false);
    setPlaybackBlocked(
      !result.ok && result.reason === "autoplay_blocked" && hasPendingSpeechPlayback()
    );
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
      lastSpokenIdRef.current = lastAssistant.id;

      unlockSpeechSynthesis();
      speakingRef.current = true;
      setIsSpeaking(true);
      setPlaybackBlocked(false);

      const result = await speakText(text);
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

    const result = await replayPendingSpeech();
    finishSpeech(result);
  }, [finishSpeech]);

  const interruptSpeech = useCallback(() => {
    stopSpeaking();
    speakingRef.current = false;
    setIsSpeaking(false);
    setPlaybackBlocked(false);
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
    speakAssistantReply,
    replayBlockedSpeech,
    interruptSpeech,
    toggleSpeechEnabled,
  };
}
