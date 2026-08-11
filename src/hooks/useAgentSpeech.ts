"use client";

import { useCallback, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/ai/message-text";
import { speakText, stopSpeaking } from "@/lib/audio/speech";

export function useAgentSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const lastSpokenIdRef = useRef<string | null>(null);
  const speakingRef = useRef(false);

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

      speakingRef.current = true;
      setIsSpeaking(true);
      await speakText(text);
      speakingRef.current = false;
      setIsSpeaking(false);
    },
    [speechEnabled]
  );

  const interruptSpeech = useCallback(() => {
    stopSpeaking();
    speakingRef.current = false;
    setIsSpeaking(false);
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
    speakAssistantReply,
    interruptSpeech,
    toggleSpeechEnabled,
  };
}
