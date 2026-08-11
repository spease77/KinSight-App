"use client";

import { useRef } from "react";
import { FileUp, Send, X } from "lucide-react";

interface TranscriptionPanelProps {
  value: string;
  isRecording: boolean;
  isTranscribing?: boolean;
  isAgentResponding?: boolean;
  isSpeaking?: boolean;
  isDetectingContacts?: boolean;
  error: string | null;
  onChange: (text: string) => void;
  onClear: () => void;
  onSubmitNotes?: (text: string) => void;
}

export function TranscriptionPanel({
  value,
  isRecording,
  isTranscribing = false,
  isAgentResponding = false,
  isSpeaking = false,
  isDetectingContacts = false,
  error,
  onChange,
  onClear,
  onSubmitNotes,
}: TranscriptionPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = Boolean(value.trim());
  const isProcessing =
    isTranscribing || isAgentResponding || isDetectingContacts;

  const statusLabel = isTranscribing
    ? "Transcribing…"
    : isDetectingContacts
      ? "Finding people in your note…"
      : isAgentResponding
        ? "KinSight is thinking…"
        : isSpeaking
          ? "KinSight is speaking…"
          : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      onChange(text);
    } catch {
      onChange("");
    }

    e.target.value = "";
  };

  const handleSubmitNotes = () => {
    if (!value.trim() || isProcessing) return;
    onSubmitNotes?.(value.trim());
  };

  return (
    <section
      aria-labelledby="transcription-heading"
      className="w-full max-w-sm"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h2
          id="transcription-heading"
          className="type-section-title font-sans text-lg tracking-tight"
        >
          Voice & Activity
        </h2>
        <div className="flex items-center gap-2">
          {onSubmitNotes && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.text,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || isProcessing}
                className="flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-accent-blue disabled:opacity-40"
              >
                <FileUp className="h-3.5 w-3.5 text-accent-blue" strokeWidth={2} />
                Upload
              </button>
            </>
          )}
          {hasContent && !isRecording && !isProcessing && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-accent-blue"
            >
              <X className="h-3.5 w-3.5 text-accent-blue" strokeWidth={2} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        className={`
          ui-card relative transition-colors
          ${isRecording ? "border-accent-orange" : ""}
          ${error ? "border-red-400" : ""}
          ${isProcessing ? "border-accent-blue/70" : ""}
        `}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isRecording
              ? "Recording… speak your update"
              : isTranscribing
                ? "Sending audio to Whisper…"
                : isDetectingContacts
                  ? "Looking for people to add…"
                  : isAgentResponding
                    ? "KinSight is thinking…"
                    : "Record, type, or upload activity about your contacts"
          }
          rows={4}
          className="
            type-editorial w-full resize-none bg-transparent px-4 py-3.5 text-sm
            placeholder:text-muted
            focus:outline-none
          "
          readOnly={isRecording || isTranscribing}
        />

        {(isRecording || isProcessing) && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            {isRecording ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent-orange" />
                <span className="ui-badge-orange px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                  Rec
                </span>
              </>
            ) : (
              <span className="ui-badge-blue px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                AI
              </span>
            )}
          </div>
        )}
      </div>

      {onSubmitNotes && hasContent && !isRecording && !isProcessing && (
        <button
          type="button"
          onClick={handleSubmitNotes}
          className="
            mt-2 flex w-full items-center justify-center gap-2 ui-btn-primary px-4 py-2.5 text-sm
            active:scale-[0.98]
          "
        >
          <Send className="h-4 w-4" strokeWidth={2} />
          Submit activity
        </button>
      )}

      {statusLabel && (
        <p className="type-meta mt-2 px-1 text-accent-blue">{statusLabel}</p>
      )}

      {error && (
        <p className="mt-2 px-1 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
