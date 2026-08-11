"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiRequestContext } from "@/lib/ai/request-context";
import { buildRequestContext } from "@/lib/ai/request-context";
import type {
  DetectContactsResult,
  ExistingContactUpdate,
  ProposedContactForReview,
} from "@/lib/contacts/detect-from-note";

type NoteContext = {
  transcript: string;
  recordingId?: string;
  entryMethod: "voice" | "manual";
  requestContext: AiRequestContext;
};

export type ContactReviewItem =
  | { kind: "create"; proposal: ProposedContactForReview }
  | { kind: "update"; update: ExistingContactUpdate };

export function useProposedContactQueue() {
  const router = useRouter();
  const [queue, setQueue] = useState<ContactReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteContextRef = useRef<NoteContext | null>(null);

  const finishQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    noteContextRef.current = null;
    router.refresh();
  }, [router]);

  const analyzeNote = useCallback(
    async (
      transcript: string,
      options?: { recordingId?: string; entryMethod?: "voice" | "manual" }
    ) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;

      setIsDetecting(true);
      setError(null);

      const entryMethod = options?.entryMethod ?? (options?.recordingId ? "voice" : "manual");
      const requestContext = buildRequestContext(entryMethod);

      try {
        const res = await fetch("/api/detect-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: trimmed,
            recordingId: options?.recordingId,
            entry_method: entryMethod,
            requestContext,
          }),
        });

        const data = (await res.json()) as DetectContactsResult & {
          error?: string;
          requestContext?: AiRequestContext;
        };

        if (!res.ok) {
          console.warn(
            "Contact detection skipped:",
            data.error ?? "Could not analyze note for contacts"
          );
          return;
        }

        noteContextRef.current = {
          transcript: trimmed,
          recordingId: options?.recordingId,
          entryMethod,
          requestContext: data.requestContext ?? requestContext,
        };

        const items: ContactReviewItem[] = [
          ...(data.newContacts ?? []).map(
            (proposal): ContactReviewItem => ({ kind: "create", proposal })
          ),
          ...(data.existingUpdates ?? []).map(
            (update): ContactReviewItem => ({ kind: "update", update })
          ),
        ];

        if (items.length === 0) {
          return;
        }

        setQueue(items);
        setCurrentIndex(0);
      } catch (err) {
        console.warn(
          "Contact detection skipped:",
          err instanceof Error ? err.message : "Could not detect contacts"
        );
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );

  const confirmCurrent = useCallback(async () => {
    const ctx = noteContextRef.current;
    const item = queue[currentIndex];
    if (!ctx || !item) return;

    setIsSaving(true);
    setError(null);

    try {
      const body =
        item.kind === "create"
          ? {
              action: "create" as const,
              person: item.proposal.person,
              transcript: ctx.transcript,
              recordingId: ctx.recordingId,
              requestContext: ctx.requestContext,
            }
          : {
              action: "update" as const,
              contactId: item.update.contactId,
              person: item.update.person,
              transcript: ctx.transcript,
              recordingId: ctx.recordingId,
              requestContext: ctx.requestContext,
            };

      const res = await fetch("/api/contacts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save contact");
      }

      router.refresh();

      const nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        finishQueue();
      } else {
        setCurrentIndex(nextIndex);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save contact");
    } finally {
      setIsSaving(false);
    }
  }, [currentIndex, finishQueue, queue, router]);

  const skipCurrent = useCallback(() => {
    const nextIndex = currentIndex + 1;
    setError(null);

    if (nextIndex >= queue.length) {
      finishQueue();
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, finishQueue, queue.length]);

  const currentItem = queue[currentIndex] ?? null;

  return {
    analyzeNote,
    currentItem,
    queueTotal: queue.length,
    queueIndex: currentIndex,
    isDetecting,
    isSaving,
    error,
    hasQueue: queue.length > 0,
    confirmCurrent,
    skipCurrent,
  };
}
