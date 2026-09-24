"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMediaRecorderForStream,
  extensionForMimeType,
} from "@/lib/audio/recorder-mime";
import {
  checkMicrophoneEnvironment,
  checkVoiceRecordingSupport,
  isIosSafariLike,
  parseMicrophoneAccessError,
  releaseActiveCaptureStream,
  requestMicrophoneStream,
  retainActiveCaptureStream,
  voiceFailureMessage,
  voiceUnsupportedMessage,
} from "@/lib/audio/voice-support";
import type {
  MicrophoneAccessFailure,
  VoiceUnsupportedReason,
} from "@/lib/audio/voice-support";
import { unlockSpeechSynthesis } from "@/lib/audio/speech";
import {
  startLiveSpeechRecognition,
  shouldUseBrowserLiveSpeech,
  type LiveSpeechSession,
} from "@/lib/audio/live-speech-recognition";
import {
  appendRecordingChunk,
  flushAndStopMediaRecorder,
  mergeRecordingChunks,
  recorderTimesliceMs,
} from "@/lib/audio/recording-engine";

type PipelineStatus = "idle" | "recording" | "transcribing";

const MIN_RECORDING_MS = 1500;

export type VoiceTranscriptResult = {
  text: string;
  recordingId: string;
};

interface UseVoicePipelineOptions {
  onTranscriptReady?: (result: VoiceTranscriptResult) => void;
  /** Fired when recording ends with text (live STT immediately, server text later). */
  onRecordingComplete?: (text: string) => void;
}

export function useVoicePipeline(options: UseVoicePipelineOptions = {}) {
  const { onTranscriptReady, onRecordingComplete } = options;
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  onTranscriptReadyRef.current = onTranscriptReady;
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  onRecordingCompleteRef.current = onRecordingComplete;

  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [permissionFailure, setPermissionFailure] =
    useState<MicrophoneAccessFailure | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [unsupportedReason, setUnsupportedReason] = useState<
    VoiceUnsupportedReason | undefined
  >(undefined);
  const [supportChecked, setSupportChecked] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("");
  const recordingStartedAtRef = useRef(0);
  const statusRef = useRef<PipelineStatus>("idle");
  const startingRef = useRef(false);
  const trackCleanupRef = useRef<(() => void) | null>(null);
  const liveSpeechSessionRef = useRef<LiveSpeechSession | null>(null);
  const usingLiveSpeechRef = useRef(false);
  const pendingClientTranscriptRef = useRef("");

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
    releaseActiveCaptureStream();
    setMediaStream(null);
  }, []);

  const stopLiveSpeech = useCallback(() => {
    liveSpeechSessionRef.current?.stop();
    liveSpeechSessionRef.current = null;
    usingLiveSpeechRef.current = false;
  }, []);

  const startLiveSpeech = useCallback(() => {
    stopLiveSpeech();
    setLiveTranscript("");

    if (!shouldUseBrowserLiveSpeech()) {
      return;
    }

    const session = startLiveSpeechRecognition({
      onInterim: (text) => {
        setLiveTranscript(text);
        setTranscript(text);
      },
      onFinal: () => {
        const text = liveSpeechSessionRef.current?.getTranscript() ?? "";
        if (text) {
          setTranscript(text);
          setLiveTranscript(text);
        }
      },
      shouldRestart: () => statusRef.current === "recording",
    });

    if (session) {
      liveSpeechSessionRef.current = session;
      usingLiveSpeechRef.current = true;
    }
  }, [stopLiveSpeech]);

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
      stopLiveSpeech();
      cleanupStream();

      statusRef.current = "idle";
      setStatus("idle");
      startingRef.current = false;
      setIsStarting(false);

      if (message) {
        setError(
          cause !== undefined
            ? voiceFailureMessage(message, cause)
            : message
        );
      }
    },
    [cleanupStream, stopLiveSpeech]
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
          if (isIosSafariLike()) return;
          resetRecordingState(
            "Microphone was muted or interrupted.",
            new DOMException("Track muted", "AbortError")
          );
        };

        track.addEventListener("ended", onEnded);
        if (!isIosSafariLike()) {
          track.addEventListener("mute", onMute);
        }
        cleanups.push(() => {
          track.removeEventListener("ended", onEnded);
          if (!isIosSafariLike()) {
            track.removeEventListener("mute", onMute);
          }
        });
      });

      trackCleanupRef.current = () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    },
    [resetRecordingState]
  );

  const transcribeAudio = useCallback(
    async (
      blob: Blob,
      mimeType: string,
      durationMs: number,
      clientTranscript?: string
    ) => {
      setStatus("transcribing");
      setError(null);

      const extension = extensionForMimeType(mimeType);
      const trimmedClient = clientTranscript?.trim() ?? "";

      try {
        const formData = new FormData();
        formData.append("audio", blob, `recording.${extension}`);
        formData.append("durationMs", String(durationMs));
        if (trimmedClient) {
          formData.append("clientTranscript", trimmedClient);
        }

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

        const text = recordingData.text ?? trimmedClient;
        const recordingId = recordingData.recordingId ?? "";

        setTranscript(text);
        setLiveTranscript("");

        if (!text.trim()) {
          setError("No speech detected. Try speaking louder and closer to the mic.");
          return;
        }

        onRecordingCompleteRef.current?.(text);

        if (recordingId) {
          onTranscriptReadyRef.current?.({ text, recordingId });
        }
      } catch (err) {
        const message = voiceFailureMessage("Transcription failed", err);
        setError(message);
        if (trimmedClient) {
          onRecordingCompleteRef.current?.(trimmedClient);
          setTranscript(trimmedClient);
        }
      } finally {
        statusRef.current = "idle";
        setStatus("idle");
      }
    },
    []
  );

  const stopRecording = useCallback(() => {
    if (startingRef.current && !mediaRecorderRef.current) {
      pendingClientTranscriptRef.current = "";
      resetRecordingState();
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    pendingClientTranscriptRef.current =
      liveSpeechSessionRef.current?.getTranscript().trim() ?? "";
    stopLiveSpeech();

    const elapsed = Date.now() - recordingStartedAtRef.current;
    if (elapsed < MIN_RECORDING_MS) {
      recorder.onerror = null;
      recorder.onstop = () => {
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        cleanupStream();
        statusRef.current = "idle";
        setStatus("idle");
        setError(
          "Recording too short. Hold the mic button and speak for at least 2 seconds."
        );
      };
      flushAndStopMediaRecorder(recorder);
      return;
    }

    statusRef.current = "transcribing";
    setStatus("transcribing");
    flushAndStopMediaRecorder(recorder);
  }, [cleanupStream, stopLiveSpeech]);

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
      setIsStarting(true);
      setError(null);
      setPermissionFailure(null);
      setTranscript("");
      setLiveTranscript("");
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
          setIsStarting(false);
          return;
        }

        let stream = preacquiredStream;
        if (!stream) {
          const environment = checkMicrophoneEnvironment();
          if (!environment.ok) {
            reportAccessFailure(environment.failure);
            startingRef.current = false;
            setIsStarting(false);
            return;
          }

          try {
            stream = await requestMicrophoneStream();
          } catch (accessError) {
            reportAccessFailure(parseMicrophoneAccessError(accessError));
            startingRef.current = false;
            setIsStarting(false);
            return;
          }
        }

        streamRef.current = stream;
        retainActiveCaptureStream(stream);
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
          appendRecordingChunk(chunksRef.current, event.data);
        };

        recorder.onstop = () => {
          const capturedMime = mimeTypeRef.current || recorder.mimeType || "audio/mp4";
          const durationMs = Math.max(
            0,
            Date.now() - recordingStartedAtRef.current
          );
          const blob = mergeRecordingChunks(chunksRef.current, capturedMime);
          chunksRef.current = [];
          mediaRecorderRef.current = null;

          const liveText =
            pendingClientTranscriptRef.current ||
            liveSpeechSessionRef.current?.getTranscript().trim() ||
            "";
          pendingClientTranscriptRef.current = "";
          stopLiveSpeech();

          if (liveText) {
            setTranscript(liveText);
            onRecordingCompleteRef.current?.(liveText);
          }

          cleanupStream();

          if (blob.size > 0) {
            void transcribeAudio(blob, capturedMime, durationMs, liveText);
          } else if (liveText) {
            statusRef.current = "idle";
            setStatus("idle");
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
          const timeslice = recorderTimesliceMs();
          if (timeslice) {
            recorder.start(timeslice);
          } else {
            recorder.start();
          }
        } catch (startError) {
          resetRecordingState("Recording failed to start.", startError);
          return;
        }

        statusRef.current = "recording";
        setStatus("recording");
        startLiveSpeech();
      } catch (unexpected) {
        releasePreacquiredStream();
        resetRecordingState("Recording failed.", unexpected);
      } finally {
        startingRef.current = false;
        setIsStarting(false);
      }
    },
    [
      applySupportCheck,
      attachStreamDiagnostics,
      cleanupStream,
      reportAccessFailure,
      resetRecordingState,
      startLiveSpeech,
      stopLiveSpeech,
      transcribeAudio,
    ]
  );

  const toggleRecording = useCallback(
    (preacquiredStream?: MediaStream) => {
      if (statusRef.current === "recording" || startingRef.current) {
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
    setLiveTranscript("");
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
      liveSpeechSessionRef.current?.stop();
      liveSpeechSessionRef.current = null;
      statusRef.current = "idle";
      startingRef.current = false;
    };
  }, []);

  return {
    isRecording: status === "recording",
    isStarting,
    isTranscribing: status === "transcribing",
    isBusy: status === "transcribing",
    isSupported,
    supportChecked,
    unsupportedReason,
    transcript,
    liveTranscript,
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
