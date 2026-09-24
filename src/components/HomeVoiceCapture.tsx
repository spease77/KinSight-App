"use client";

import { useEffect, useState } from "react";
import { Mic, Square } from "lucide-react";
import { ListeningWaveform } from "@/components/ListeningWaveform";
import { primeLiveSpeechRecognitionFromUserGesture } from "@/lib/audio/live-speech-recognition";
import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";
import {
  checkMicrophoneEnvironment,
  logVoiceDiagnostic,
  parseMicrophoneAccessError,
  requestMicrophoneStreamFromUserGesture,
  unlockRecordingAudioFromUserGesture,
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
  const showWaveform = isRecording;

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

    unlockRecordingAudioFromUserGesture();
    primeLiveSpeechRecognitionFromUserGesture();

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
          className="home-voice-capture__hero-button home-voice-mic-idle relative flex shrink-0 items-center justify-center rounded-full active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span
            className={`home-voice-capture__hero-ring mic-ring pointer-events-none absolute rounded-full border ${
              isListening
                ? "mic-ring-recording mic-ring-fast"
                : "border-accent-mic/50"
            }`}
            aria-hidden="true"
          />
          <span
            className={`home-voice-capture__hero-ring mic-ring mic-ring-delay pointer-events-none absolute rounded-full border ${
              isListening
                ? "mic-ring-recording mic-ring-recording--soft mic-ring-fast"
                : "border-accent-mic/35"
            }`}
            aria-hidden="true"
          />

          <span
            className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full transition-colors duration-200 ${
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
              <Square
                className="relative z-10 h-9 w-9 fill-white text-white"
                strokeWidth={0}
                aria-hidden="true"
              />
            ) : (
              <Mic
                className="relative z-10 h-14 w-14 text-white"
                strokeWidth={2.25}
                aria-hidden="true"
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
            variant="line"
            volumeLevel={volumeLevel}
            waveformBands={waveformBands}
            active
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
