"use client";

import { useCallback, useState } from "react";
import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";
import {
  checkMicrophoneEnvironment,
  parseMicrophoneAccessError,
  requestMicrophoneStreamFromUserGesture,
} from "@/lib/audio/voice-support";

export function useVoiceDebrief() {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [failure, setFailure] = useState<MicrophoneAccessFailure | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const start = useCallback(() => {
    const environment = checkMicrophoneEnvironment();
    if (!environment.ok) {
      setFailure(environment.failure);
      return;
    }

    void requestMicrophoneStreamFromUserGesture().then(
      (nextStream) => {
        setFailure(null);
        setStream(nextStream);
        setOpen(true);
      },
      (error) => {
        setFailure(parseMicrophoneAccessError(error));
      }
    );
  }, []);

  return {
    open,
    stream,
    failure,
    start,
    close,
    clearFailure: () => setFailure(null),
  };
}
