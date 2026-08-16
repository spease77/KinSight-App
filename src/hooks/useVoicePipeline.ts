"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  extensionForMimeType,
  pickRecorderMimeType,
} from "@/lib/audio/recorder-mime";
import {
  checkMicrophoneEnvironment,
  checkVoiceRecordingSupport,
  parseMicrophoneAccessError,
  requestMicrophoneStream,
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
  const mimeTypeRef = useRef("audio/webm");
  const recordingStartedAtRef = useRef(0);

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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMediaStream(null);
  }, []);

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
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  },
  []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const elapsed = Date.now() - recordingStartedAtRef.current;
    if (elapsed < MIN_RECORDING_MS) {
      recorder.onstop = null;
      recorder.stop();
      cleanupStream();
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setStatus("idle");
      setError(
        "Recording too short. Hold the mic button and speak for at least 2 seconds."
      );
      return;
    }

    if (recorder.state === "recording") {
      recorder.requestData();
      recorder.stop();
    }
  }, [cleanupStream]);

  const startRecording = useCallback(
    async (preacquiredStream?: MediaStream) => {
      setError(null);
      setPermissionFailure(null);
      unlockSpeechSynthesis();

      const support = applySupportCheck();
      if (!support.supported) {
        const message = voiceUnsupportedMessage(support.reason);
        setError(message);
        if (support.reason === "insecure_context" || support.reason === "no_api") {
          setPermissionFailure({
            reason: support.reason,
            message,
            showSettingsGuide: false,
          });
        }
        preacquiredStream?.getTracks().forEach((track) => track.stop());
        return;
      }

      const mimeType = pickRecorderMimeType();
      if (!mimeType) {
        preacquiredStream?.getTracks().forEach((track) => track.stop());
        setError("Audio recording is not supported in this browser.");
        return;
      }

      let stream = preacquiredStream;
      if (!stream) {
        const environment = checkMicrophoneEnvironment();
        if (!environment.ok) {
          reportAccessFailure(environment.failure);
          return;
        }

        try {
          stream = await requestMicrophoneStream();
        } catch (accessError) {
          reportAccessFailure(parseMicrophoneAccessError(accessError));
          return;
        }
      }

      try {
        streamRef.current = stream;
        setMediaStream(stream);
        chunksRef.current = [];
        mimeTypeRef.current = mimeType;

        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const capturedMime = mimeTypeRef.current;
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
            setStatus("idle");
            setError("No audio captured. Try recording again.");
          }
        };

        recorder.onerror = () => {
          cleanupStream();
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          setStatus("idle");
          setError("Recording failed. Please try again.");
        };

        mediaRecorderRef.current = recorder;
        recordingStartedAtRef.current = Date.now();
        recorder.start(CHUNK_INTERVAL_MS);
        setStatus("recording");
      } catch {
        cleanupStream();
        preacquiredStream?.getTracks().forEach((track) => track.stop());
        setStatus("idle");
        setError("Recording failed. Please try again.");
      }
    },
    [applySupportCheck, cleanupStream, reportAccessFailure, transcribeAudio]
  );

  const toggleRecording = useCallback(
    (preacquiredStream?: MediaStream) => {
      if (status === "recording") {
        stopRecording();
      } else if (status === "idle") {
        void startRecording(preacquiredStream);
      }
    },
    [status, startRecording, stopRecording]
  );

  const clearTranscript = useCallback(() => {
    if (status === "recording") {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      cleanupStream();
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setStatus("idle");
    }
    setTranscript("");
    setError(null);
    setPermissionFailure(null);
  }, [status, cleanupStream]);

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
        recorder.stop();
      }
      cleanupStream();
    };
  }, [cleanupStream]);

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
