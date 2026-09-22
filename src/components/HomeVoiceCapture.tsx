"use client";

import { useEffect, useState } from "react";
import { Mic, Square } from "lucide-react";
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

  const isListening = isRecording || isStarting || isAwaitingStream;
  const displayLiveText =
    liveTranscript.trim() ||
    (isListening ? "Listening…" : "");
  const resultText = transcript.trim();
  const showResult = !isListening && !isTranscribing && Boolean(resultText);
  const showProcessing = !isListening && isTranscribing;
  const processingText = resultText || liveTranscript.trim();

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

  const handleStop = () => {
    if (!isRecording) return;
    onStop();
  };

  if (isListening) {
    return (
      <div className="home-voice-session flex w-full max-w-md flex-col items-center gap-5 px-3">
        <ListeningWaveform
          variant="bars"
          volumeLevel={volumeLevel}
          waveformBands={waveformBands}
          active={isRecording}
          className="max-w-sm"
        />
        <p
          className="home-voice-session__live min-h-[3.5rem] w-full max-w-sm text-center text-base font-normal leading-relaxed text-foreground"
          role="status"
          aria-live="polite"
        >
          {displayLiveText}
        </p>
        <button
          type="button"
          onClick={handleStop}
          disabled={!isRecording}
          className="home-voice-stop flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          aria-label="Stop recording"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-red-500">
            <Square className="h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
          </span>
          Stop
        </button>
      </div>
    );
  }

  if (showProcessing) {
    return (
      <div className="home-voice-session flex w-full max-w-md flex-col items-center gap-4 px-3">
        <ListeningWaveform
          variant="bars"
          volumeLevel={0}
          active={false}
          className="max-w-sm opacity-70"
        />
        <p className="type-meta text-sm text-muted">Transcribing…</p>
        {processingText ? (
          <p className="home-voice-session__result w-full max-w-sm text-center text-base leading-relaxed text-foreground/90">
            {processingText}
          </p>
        ) : null}
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="home-voice-session flex w-full max-w-md flex-col items-center gap-6 px-3">
        <p className="home-voice-session__result w-full max-w-sm text-center text-lg leading-relaxed text-foreground">
          {resultText}
        </p>
        <button
          type="button"
          onClick={handleStart}
          disabled={isBusy}
          className="home-voice-mic-idle relative flex h-44 w-44 items-center justify-center rounded-full active:scale-95 disabled:opacity-40 sm:h-52 sm:w-52"
          aria-label="Record again"
        >
          <span className="mic-ring pointer-events-none absolute h-44 w-44 rounded-full border border-accent-mic/50 sm:h-52 sm:w-52" />
          <span className="mic-ring mic-ring-delay pointer-events-none absolute h-44 w-44 rounded-full border border-accent-mic/35 sm:h-52 sm:w-52" />
          <span className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full mic-inner-idle sm:h-28 sm:w-28">
            <Mic className="h-12 w-12 text-foreground sm:h-14 sm:w-14" strokeWidth={2.25} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={isBusy}
      className="home-voice-mic-idle relative flex h-44 w-44 items-center justify-center rounded-full active:scale-95 disabled:opacity-40 sm:h-52 sm:w-52"
      aria-label="Start recording"
    >
      <span className="mic-ring pointer-events-none absolute h-44 w-44 rounded-full border border-accent-mic/50 sm:h-52 sm:w-52" />
      <span className="mic-ring mic-ring-delay pointer-events-none absolute h-44 w-44 rounded-full border border-accent-mic/35 sm:h-52 sm:w-52" />
      <span className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full mic-inner-idle sm:h-28 sm:w-28">
        <Mic className="h-12 w-12 text-foreground sm:h-14 sm:w-14" strokeWidth={2.25} />
      </span>
    </button>
  );
}
