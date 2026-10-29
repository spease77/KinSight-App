"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { ContactPickerModal } from "@/components/ContactPickerModal";
import type { ContactPickerCandidate } from "@/components/ContactPickerModal";
import { readApiJson } from "@/lib/api/read-json";
import {
  appendRecordingChunk,
  flushAndStopMediaRecorder,
  mergeRecordingChunks,
  recorderTimesliceMs,
} from "@/lib/audio/recording-engine";
import { createMediaRecorderForStream } from "@/lib/audio/recorder-mime";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import type { VoiceLogActionItem, VoiceLogRecord } from "@/lib/supabase/voice-logs";

type CapturePhase = "recording" | "processing" | "confirm";

type PendingDebrief = {
  transcript: string;
  ai_summary: string;
  action_items: VoiceLogActionItem[];
  mentioned_names: string[];
  spoken_name: string;
  candidates: ContactPickerCandidate[];
  calendar_event_id?: string | null;
};

interface VoiceCaptureModalProps {
  open: boolean;
  stream: MediaStream | null;
  contactId?: string | null;
  calendarEventId?: string | null;
  externalEventId?: string | null;
  provider?: string | null;
  eventTitle?: string | null;
  onClose: () => void;
  onComplete?: (voiceLog: VoiceLogRecord) => void;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function VoiceCaptureModal({
  open,
  stream,
  contactId,
  calendarEventId,
  externalEventId,
  provider,
  eventTitle,
  onClose,
  onComplete,
}: VoiceCaptureModalProps) {
  const [phase, setPhase] = useState<CapturePhase>("recording");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDebrief | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/mp4");
  const submittingRef = useRef(false);
  const discardedRef = useRef(false);

  const stopTracks = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const resetAndClose = useCallback(() => {
    discardedRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {
        // already stopping
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    submittingRef.current = false;
    stopTracks();
    setPhase("recording");
    setElapsed(0);
    setError(null);
    setPending(null);
    onClose();
  }, [onClose, stopTracks]);

  const submitDebrief = useCallback(
    async (blob?: Blob, extras?: { contactId?: string; spokenName?: string }) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setPhase("processing");
      setError(null);

      const form = new FormData();
      if (blob && blob.size > 0) {
        const mime = blob.type || mimeRef.current || "audio/webm";
        const extension = mime.includes("mp4") ? "m4a" : "webm";
        form.append("audio", blob, `debrief.${extension}`);
      }
      const resolvedContactId = extras?.contactId || contactId;
      if (resolvedContactId) form.append("contact_id", resolvedContactId);
      if (calendarEventId) form.append("calendar_event_id", calendarEventId);
      if (externalEventId) form.append("external_event_id", externalEventId);
      if (provider) form.append("provider", provider);
      if (eventTitle) form.append("event_title", eventTitle);
      if (extras?.spokenName) form.append("spoken_name", extras.spokenName);
      if (pending && !blob) {
        form.append("transcript", pending.transcript);
        form.append("ai_summary", pending.ai_summary);
        form.append("action_items", JSON.stringify(pending.action_items));
        form.append("mentioned_names", pending.mentioned_names.join(","));
        if (pending.calendar_event_id) {
          form.append("calendar_event_id", pending.calendar_event_id);
        }
      }

      try {
        const res = await fetch("/api/audio/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await readApiJson<{
          voice_log?: VoiceLogRecord;
          needs_confirmation?: boolean;
          spoken_name?: string;
          candidates?: ContactPickerCandidate[];
          transcript?: string;
          ai_summary?: string;
          action_items?: VoiceLogActionItem[];
          mentioned_names?: string[];
          calendar_event_id?: string | null;
          error?: string;
        }>(res);

        if (data.needs_confirmation && data.candidates?.length) {
          setPending({
            transcript: data.transcript ?? "",
            ai_summary: data.ai_summary ?? "",
            action_items: data.action_items ?? [],
            mentioned_names: data.mentioned_names ?? [],
            spoken_name: data.spoken_name ?? "",
            candidates: data.candidates,
            calendar_event_id: data.calendar_event_id,
          });
          setPhase("confirm");
          submittingRef.current = false;
          return;
        }

        if (!res.ok || !data.voice_log) {
          throw new Error(data.error ?? "Could not process this recording.");
        }

        showSuccessToast("Debrief saved to the contact.");
        onComplete?.(data.voice_log);
        stopTracks();
        setPending(null);
        onClose();
      } catch (err) {
        submittingRef.current = false;
        setPhase(pending ? "confirm" : "recording");
        const message =
          err instanceof Error ? err.message : "Could not process this recording.";
        setError(message);
        showErrorToast(message);
      }
    },
    [
      calendarEventId,
      contactId,
      eventTitle,
      externalEventId,
      onClose,
      onComplete,
      pending,
      provider,
      stopTracks,
    ]
  );

  useEffect(() => {
    if (!open || !stream) return;

    chunksRef.current = [];
    submittingRef.current = false;
    discardedRef.current = false;
    setPhase("recording");
    setElapsed(0);
    setError(null);
    setPending(null);

    try {
      const created = createMediaRecorderForStream(stream);
      mimeRef.current = created.mimeType;
      created.recorder.ondataavailable = (event) => {
        appendRecordingChunk(chunksRef.current, event.data);
      };
      created.recorder.onstop = () => {
        if (discardedRef.current || submittingRef.current) return;
        const blob = mergeRecordingChunks(
          chunksRef.current,
          mimeRef.current || created.recorder.mimeType || "audio/mp4"
        );
        chunksRef.current = [];
        recorderRef.current = null;
        void submitDebrief(blob);
      };
      recorderRef.current = created.recorder;
      const timeslice = recorderTimesliceMs();
      if (timeslice) created.recorder.start(timeslice);
      else created.recorder.start();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the microphone."
      );
    }

    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
      discardedRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state === "recording") {
        try {
          recorder.stop();
        } catch {
          // closing
        }
      }
      recorderRef.current = null;
    };
    // Start only when the modal opens with a live stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stream]);

  if (!open) return null;

  if (phase === "confirm" && pending) {
    return (
      <ContactPickerModal
        spokenName={pending.spoken_name}
        candidates={pending.candidates}
        isSaving={false}
        error={error}
        onSelect={(id) => {
          void submitDebrief(undefined, {
            contactId: id,
            spokenName: pending.spoken_name,
          });
        }}
        onSkip={resetAndClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[110px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-capture-title"
    >
      <div className="ui-card w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-hotel-border px-5 py-4">
          <div>
            <p className="type-meta text-muted">Quick debrief</p>
            <h2
              id="voice-capture-title"
              className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
            >
              {phase === "processing" ? "Processing" : "Recording"}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
            aria-label="Cancel recording"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-5 py-8">
          <div className="relative flex h-24 w-24 items-center justify-center">
            {phase === "recording" ? (
              <>
                <span
                  className="mic-ring pointer-events-none absolute rounded-full border border-accent-mic/50"
                  aria-hidden="true"
                />
                <span
                  className="mic-ring mic-ring-delay pointer-events-none absolute rounded-full border border-accent-mic/35"
                  aria-hidden="true"
                />
              </>
            ) : null}
            <span
              className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full ${
                phase === "recording" ? "mic-inner-recording" : "mic-inner-idle"
              }`}
            >
              {phase === "processing" ? (
                <Loader2 className="h-7 w-7 animate-spin text-white" strokeWidth={2} />
              ) : (
                <Mic className="h-7 w-7 text-white" strokeWidth={2.25} />
              )}
            </span>
          </div>

          <p className="font-mono text-2xl tabular-nums text-foreground">
            {formatTimer(elapsed)}
          </p>
          <p className="text-center text-sm text-muted">
            {phase === "processing"
              ? "Transcribing & extracting insights…"
              : "Speak the debrief, then stop."}
          </p>
          {error ? (
            <p className="text-center text-sm text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-hotel-border px-5 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={phase === "processing"}
            className="ui-btn-secondary flex-1 px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={phase !== "recording"}
            onClick={() => {
              const recorder = recorderRef.current;
              if (!recorder || recorder.state !== "recording") return;
              submittingRef.current = false;
              flushAndStopMediaRecorder(recorder);
            }}
            className="ui-btn-orange flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-40"
          >
            <Square className="h-4 w-4" strokeWidth={2} />
            Stop & Process
          </button>
        </div>
      </div>
    </div>
  );
}
