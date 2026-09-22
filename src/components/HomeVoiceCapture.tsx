"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { ListeningWaveform } from "@/components/ListeningWaveform";
import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";
import {
  checkMicrophoneEnvironment,
  logVoiceDiagnostic,
  parseMicrophoneAccessError,
  requestMicrophoneStreamFromUserGesture,
  voiceFailureMessage,
} from "@/lib/audio/voice-support";

type HomeVoiceCaptureProps = {
  isRecording: boolean;
  isStarting: boolean;
  isTranscribing: boolean;
  isBusy: boolean;
  volumeLevel: number;
  waveformBands?: number[];
  liveTranscript: string;
  transcript: string;
  onStart: (stream: MediaStream) => void;
  onStop: () => void;
  onMicAccessFailure?: (failure: MicrophoneAccessFailure) => void;
};

export function HomeVoiceCapture({
  isRecording,
  isStarting,
  isTranscribing,
  isBusy,
  volumeLevel,
  waveformBands,
  liveTranscript,
  transcript,
  onStart,
  onStop,
  onMicAccessFailure,
}: HomeVoiceCaptureProps) {
  const [isAwaitingStream, setIsAwaitingStream] = useState(false);

  const isConnecting = isStarting || isAwaitingStream;
  const isListening = isRecording || isConnecting;
  const showStopIcon = isRecording;
  const showWaveform = isListening || isTranscribing;

  const statusHint = isTranscribing
    ? "Transcribing…"
    : isRecording
      ? liveTranscript.trim() || "Listening…"
      : isConnecting
        ? "Starting microphone…"
        : "";

  useEffect(() => {
    if (isRecording || isStarting) {
      setIsAwaitingStream(false);
    }
  }, [isRecording, isStarting]);

  const handleStart = () => {
    if (isBusy || isListening || isTranscribing) return;

    const environment = checkMicrophoneEnvironment();
    if (!environment.ok) {
      onMicAccessFailure?.(environment.failure);
      return;
    }

    setIsAwaitingStream(true);
    void requestMicrophoneStreamFromUserGesture().then(
      (stream) => {
        onStart(stream);
      },
      (error) => {
        setIsAwaitingStream(false);
        logVoiceDiagnostic("Microphone access failed", error);
        const failure = parseMicrophoneAccessError(error);
        onMicAccessFailure?.({
          ...failure,
          message: voiceFailureMessage(failure.message, error),
        });
      }
    );
  };

  const handleMainButtonPress = () => {
    if (isRecording || isConnecting) {
      onStop();
      return;
    }
    handleStart();
  };

  return (
    <div className="home-voice-capture flex w-full max-w-md flex-col items-center px-2">
      <div className="home-voice-capture__button-slot">
        <button
          type="button"
          onClick={handleMainButtonPress}
          disabled={isBusy && !isListening}
          aria-label={showStopIcon ? "Stop recording" : "Start recording"}
          aria-pressed={isListening}
          className="home-voice-mic-idle relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-52 sm:w-52"
        >
          <span
            className={`mic-ring pointer-events-none absolute h-44 w-44 rounded-full border sm:h-52 sm:w-52 ${
              isListening
                ? "mic-ring-recording mic-ring-fast"
                : "border-accent-mic/50"
            }`}
            aria-hidden="true"
          />
          <span
            className={`mic-ring mic-ring-delay pointer-events-none absolute h-44 w-44 rounded-full border sm:h-52 sm:w-52 ${
              isListening
                ? "mic-ring-recording mic-ring-recording--soft mic-ring-fast"
                : "border-accent-mic/35"
            }`}
            aria-hidden="true"
          />

          <span
            className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-colors duration-200 sm:h-28 sm:w-28 ${
              isListening ? "mic-inner-recording" : "mic-inner-idle"
            }`}
          >
            {isListening && (
              <span
                className="mic-listening-pulse pointer-events-none absolute inset-0 rounded-full"
                aria-hidden="true"
              />
            )}
            {showStopIcon ? (
              <span
                className="relative z-10 h-8 w-8 rounded-[7px] bg-white sm:h-9 sm:w-9"
                aria-hidden="true"
              />
            ) : (
              <Mic
                className="relative z-10 h-12 w-12 text-foreground sm:h-14 sm:w-14"
                strokeWidth={2.25}
              />
            )}
          </span>
        </button>
      </div>

      <div
        className={`home-voice-capture__wave-slot w-full max-w-sm ${
          showWaveform ? "home-voice-capture__wave-slot--active" : ""
        }`}
        aria-hidden={!showWaveform}
      >
        {showWaveform ? (
          <ListeningWaveform
            variant="bars"
            volumeLevel={isRecording ? volumeLevel : 0}
            waveformBands={waveformBands}
            active={isRecording}
            className="w-full"
          />
        ) : null}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusHint}
        {transcript ? ` ${transcript}` : ""}
      </p>
    </div>
  );
}
