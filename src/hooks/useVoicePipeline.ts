"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMediaRecorderForStream,
  extensionForMimeType,
} from "@/lib/audio/recorder-mime";
import {
  checkMicrophoneEnvironment,
  checkVoiceRecordingSupport,
  parseMicrophoneAccessError,
  requestMicrophoneStream,
  voiceFailureMessage,
  voiceUnsupportedMessage,
} from "@/lib/audio/voice-support";
import type {
  MicrophoneAccessFailure,
  VoiceUnsupportedReason,
} from "@/lib/audio/voice-support";
import { unlockSpeechSynthesis } from "@/lib/audio/speech";

type PipelineStatus = "idle" | "recording" | "transcribing";

const MIN_RECORDING_MS = 1500;
const CHUNK_INTERVAL_MS = 250;
const IOS_STOP_FLUSH_MS = 300;

function isAppleMobileDevice(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export type VoiceTranscriptResult = {
  text: string;
  recordingId: string;
};

interface UseVoicePipelineOptions {
  onTranscriptReady?: (result: VoiceTranscriptResult) => void;
}

export function useVoicePipeline(options: UseVoicePipelineOptions = {}) {
  const { onTranscriptReady } = options;
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  onTranscriptReadyRef.current = onTranscriptReady;

  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [permissionFailure, setPermissionFailure] =
    useState<MicrophoneAccessFailure | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [unsupportedReason, setUnsupportedReason] = useState<
    VoiceUnsupportedReason | undefined
  >(undefined);
  const [supportChecked, setSupportChecked] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("");
  const recordingStartedAtRef = useRef(0);
  const statusRef = useRef<PipelineStatus>("idle");
  const startingRef = useRef(false);
  const trackCleanupRef = useRef<(() => void) | null>(null);

  statusRef.current = status;

  const applySupportCheck = useCallback(() => {
    const check = checkVoiceRecordingSupport();
    setIsSupported(check.supported);
    setUnsupportedReason(check.reason);
    setSupportChecked(true);
    return check;
  }, []);

  const reportAccessFailure = useCallback((failure: MicrophoneAccessFailure) => {
    setError(failure.message);
    setPermissionFailure(failure.showSettingsGuide ? failure : null);
  }, []);

  const cleanupStream = useCallback(() => {
    trackCleanupRef.current?.();
    trackCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMediaStream(null);
  }, []);

  const resetRecordingState = useCallback(
    (message?: string, cause?: unknown) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.onerror = null;
        try {
          recorder.stop();
        } catch {
          // Already stopped.
        }
      }

      mediaRecorderRef.current = null;
      chunksRef.current = [];
      cleanupStream();

      statusRef.current = "idle";
      setStatus("idle");
      startingRef.current = false;

      if (message) {
        setError(
          cause !== undefined
            ? voiceFailureMessage(message, cause)
            : message
        );
      }
    },
    [cleanupStream]
  );

  const attachStreamDiagnostics = useCallback(
    (stream: MediaStream) => {
      trackCleanupRef.current?.();

      const cleanups: Array<() => void> = [];

      stream.getAudioTracks().forEach((track) => {
        const onEnded = () => {
          if (statusRef.current !== "recording") return;
          resetRecordingState(
            "Microphone stopped unexpectedly.",
            new DOMException("Track ended", "AbortError")
          );
        };

        const onMute = () => {
          if (statusRef.current !== "recording") return;
          resetRecordingState(
            "Microphone was muted or interrupted.",
            new DOMException("Track muted", "AbortError")
          );
        };

        track.addEventListener("ended", onEnded);
        track.addEventListener("mute", onMute);
        cleanups.push(() => {
          track.removeEventListener("ended", onEnded);
          track.removeEventListener("mute", onMute);
        });
      });

      trackCleanupRef.current = () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    },
    [resetRecordingState]
  );

  const transcribeAudio = useCallback(
    async (blob: Blob, mimeType: string, durationMs: number) => {
      setStatus("transcribing");
      setError(null);

      const extension = extensionForMimeType(mimeType);

      try {
        const formData = new FormData();
        formData.append("audio", blob, `recording.${extension}`);
        formData.append("durationMs", String(durationMs));

        const recordingRes = await fetch("/api/recordings", {
          method: "POST",
          body: formData,
        });

        const recordingData = (await recordingRes.json()) as {
          text?: string;
          recordingId?: string;
          error?: string;
        };

        if (!recordingRes.ok) {
          throw new Error(recordingData.error ?? "Voice note upload failed");
        }

        const text = recordingData.text ?? "";
        const recordingId = recordingData.recordingId ?? "";

        setTranscript(text);

        if (!text.trim()) {
          setError("No speech detected. Try speaking louder and closer to the mic.");
          return;
        }

        if (!recordingId) {
          throw new Error("Voice note was not saved. Please try again.");
        }

        onTranscriptReadyRef.current?.({ text, recordingId });
      } catch (err) {
        setError(
          voiceFailureMessage("Transcription failed", err)
        );
      } finally {
        statusRef.current = "idle";
        setStatus("idle");
      }
    },
    []
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const elapsed = Date.now() - recordingStartedAtRef.current;
    if (elapsed < MIN_RECORDING_MS) {
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
      resetRecordingState(
        "Recording too short. Hold the mic button and speak for at least 2 seconds."
      );
      return;
    }

    if (recorder.state === "recording") {
      recorder.requestData();
      const finishStop = () => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      };

      if (isAppleMobileDevice()) {
        window.setTimeout(finishStop, IOS_STOP_FLUSH_MS);
      } else {
        finishStop();
      }
    }
  }, [resetRecordingState]);

  const startRecording = useCallback(
    async (preacquiredStream?: MediaStream) => {
      if (statusRef.current !== "idle" || startingRef.current) {
        preacquiredStream?.getTracks().forEach((track) => track.stop());
        if (statusRef.current === "transcribing") {
          setError(
            "Still processing your last recording. Wait a moment and try again."
          );
        }
        return;
      }

      startingRef.current = true;
      setError(null);
      setPermissionFailure(null);
      unlockSpeechSynthesis();

      const releasePreacquiredStream = () => {
        preacquiredStream?.getTracks().forEach((track) => track.stop());
      };

      try {
        const support = applySupportCheck();
        if (!support.supported) {
          const message = voiceUnsupportedMessage(support.reason);
          setError(message);
          if (
            support.reason === "insecure_context" ||
            support.reason === "no_api"
          ) {
            setPermissionFailure({
              reason: support.reason,
              message,
              showSettingsGuide: false,
            });
          }
          releasePreacquiredStream();
          startingRef.current = false;
          return;
        }

        let stream = preacquiredStream;
        if (!stream) {
          const environment = checkMicrophoneEnvironment();
          if (!environment.ok) {
            reportAccessFailure(environment.failure);
            startingRef.current = false;
            return;
          }

          try {
            stream = await requestMicrophoneStream();
          } catch (accessError) {
            reportAccessFailure(parseMicrophoneAccessError(accessError));
            startingRef.current = false;
            return;
          }
        }

        streamRef.current = stream;
        setMediaStream(stream);
        attachStreamDiagnostics(stream);
        chunksRef.current = [];

        let recorder: MediaRecorder;
        let resolvedMime: string;

        try {
          const created = createMediaRecorderForStream(stream);
          recorder = created.recorder;
          resolvedMime = created.mimeType;
        } catch (recorderError) {
          releasePreacquiredStream();
          resetRecordingState("Could not start audio recording.", recorderError);
          return;
        }

        mimeTypeRef.current = resolvedMime;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const capturedMime = mimeTypeRef.current || recorder.mimeType || "audio/mp4";
          const durationMs = Math.max(
            0,
            Date.now() - recordingStartedAtRef.current
          );
          const blob = new Blob(chunksRef.current, { type: capturedMime });
          chunksRef.current = [];
          mediaRecorderRef.current = null;
          cleanupStream();

          if (blob.size > 0) {
            void transcribeAudio(blob, capturedMime, durationMs);
          } else {
            statusRef.current = "idle";
            setStatus("idle");
            setError(
              voiceFailureMessage(
                "No audio captured. Try recording again.",
                new Error(`empty blob (${capturedMime})`)
              )
            );
          }
        };

        recorder.onerror = (event: Event) => {
          const recorderError =
            "error" in event
              ? (event as Event & { error?: DOMException }).error
              : event;
          resetRecordingState("Recording failed.", recorderError ?? event);
        };

        mediaRecorderRef.current = recorder;
        recordingStartedAtRef.current = Date.now();

        try {
          if (isAppleMobileDevice()) {
            recorder.start();
          } else {
            recorder.start(CHUNK_INTERVAL_MS);
          }
        } catch (startError) {
          resetRecordingState("Recording failed to start.", startError);
          return;
        }

        statusRef.current = "recording";
        setStatus("recording");
      } catch (unexpected) {
        releasePreacquiredStream();
        resetRecordingState("Recording failed.", unexpected);
      } finally {
        startingRef.current = false;
      }
    },
    [
      applySupportCheck,
      attachStreamDiagnostics,
      cleanupStream,
      reportAccessFailure,
      resetRecordingState,
      transcribeAudio,
    ]
  );

  const toggleRecording = useCallback(
    (preacquiredStream?: MediaStream) => {
      if (statusRef.current === "recording") {
        stopRecording();
      } else if (statusRef.current === "idle") {
        void startRecording(preacquiredStream);
      }
    },
    [startRecording, stopRecording]
  );

  const clearTranscript = useCallback(() => {
    if (status === "recording") {
      resetRecordingState();
    }
    setTranscript("");
    setError(null);
    setPermissionFailure(null);
  }, [status, resetRecordingState]);

  const clearPermissionFailure = useCallback(() => {
    setPermissionFailure(null);
  }, []);

  const setTranscriptText = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.onerror = null;
        try {
          recorder.stop();
        } catch {
          // Already inactive.
        }
      }
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      trackCleanupRef.current?.();
      trackCleanupRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      statusRef.current = "idle";
      startingRef.current = false;
    };
  }, []);

  return {
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    isBusy: status === "transcribing",
    isSupported,
    supportChecked,
    unsupportedReason,
    transcript,
    error,
    permissionFailure,
    mediaStream,
    toggleRecording,
    beginRecording: startRecording,
    clearTranscript,
    clearPermissionFailure,
    setTranscriptText,
  };
}
