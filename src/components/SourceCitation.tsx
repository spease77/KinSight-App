"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Pause, Play, X } from "lucide-react";
import type { FieldSourceMetadata } from "@/types/source-metadata";
import { isManualSource, isVoiceSource } from "@/types/source-metadata";

type SourceCitationProps = {
  contactId: string;
  fieldKey: string;
  /** When already loaded on the contact detail page */
  source?: FieldSourceMetadata;
};

export function SourceCitation({
  contactId,
  fieldKey,
  source: initialSource,
}: SourceCitationProps) {
  const [open, setOpen] = useState(false);
  const [fetchedSource, setFetchedSource] = useState<FieldSourceMetadata | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const source = initialSource ?? fetchedSource;

  const loadSource = useCallback(async () => {
    if (source || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      const data = (await res.json()) as {
        contact?: { sourceMetadata?: Record<string, FieldSourceMetadata> };
      };
      const found = data.contact?.sourceMetadata?.[fieldKey];
      if (found) setFetchedSource(found);
    } finally {
      setLoading(false);
    }
  }, [contactId, fieldKey, loading, source]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const stopClip = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const playClip = useCallback(async () => {
    if (!source || !isVoiceSource(source)) return;

    stopClip();

    let audioUrl = source.audioUrl;
    if (!audioUrl) {
      const metaRes = await fetch(`/api/recordings/${source.recordingId}`);
      const meta = (await metaRes.json()) as { audioUrl?: string };
      audioUrl = meta.audioUrl ?? "";
    }
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.currentTime = source.startMs / 1000;

    const clipDuration = Math.max(
      500,
      (source.endMs - source.startMs) || 5000
    );

    audio.onended = () => setPlaying(false);
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));

    stopTimerRef.current = setTimeout(() => {
      audio.pause();
      setPlaying(false);
    }, clipDuration);
  }, [source, stopClip]);

  const handleToggle = async () => {
    if (open) {
      stopClip();
      setOpen(false);
      return;
    }

    if (!source) await loadSource();
    setOpen(true);
  };

  const isManual = source ? isManualSource(source) : false;

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => void handleToggle()}
        className={`
          ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-border
          transition-colors hover:brightness-110
          ${isManual ? "ui-badge-blue text-foreground" : "ui-badge-green text-foreground"}
        `}
        aria-label="View source for this fact"
        title={isManual ? "View manual entry source" : "View voice note source"}
      >
        <Link2 className="h-2.5 w-2.5" strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className="
            absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2
            rounded-xl border border-border bg-card p-3
          "
          role="dialog"
          aria-label="Source details"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="type-meta text-foreground">
              {isManual ? "Manual entry" : "Voice source"}
            </p>
            <button
              type="button"
              onClick={() => {
                stopClip();
                setOpen(false);
              }}
              className="text-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading && (
            <p className="type-meta">Loading source…</p>
          )}

          {!loading && !source && (
            <p className="type-meta">
              No source saved for this field yet.
            </p>
          )}

          {source && isManualSource(source) && (
            <p className="type-editorial text-xs">
              Typed manually on{" "}
              <span className="font-mono text-foreground">{source.updated_at}</span>
            </p>
          )}

          {source && isVoiceSource(source) && (
            <>
              <p className="type-editorial text-xs">
                &ldquo;{source.excerpt}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => void (playing ? stopClip() : playClip())}
                className="ui-btn-outline mt-2.5 flex w-full items-center justify-center gap-1.5 px-2 py-1.5 text-[11px]"
              >
                {playing ? (
                  <Pause className="h-3 w-3" strokeWidth={2} />
                ) : (
                  <Play className="h-3 w-3" strokeWidth={2} />
                )}
                {playing ? "Stop clip" : "Play ~5s clip"}
              </button>
            </>
          )}
        </div>
      )}
    </span>
  );
}
