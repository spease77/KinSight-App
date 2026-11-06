"use client";

import { Check } from "lucide-react";
import type { VoiceDebriefCaptureResult } from "@/lib/contacts/voice-debrief-result";

interface DebriefResultSheetProps {
  result: VoiceDebriefCaptureResult;
  onDone: () => void;
}

export function DebriefResultSheet({ result, onDone }: DebriefResultSheetProps) {
  const notes = result.personal_notes.filter(Boolean);
  const tasks = [
    ...(result.follow_up_tasks ?? []),
    ...(result.action_items ?? []).map((item) => ({
      title: item.text,
      due_at: null as string | null,
    })),
  ].filter((task, index, list) => {
    const key = task.title.trim().toLowerCase();
    return (
      key &&
      list.findIndex((entry) => entry.title.trim().toLowerCase() === key) ===
        index
    );
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[110px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-result-title"
    >
      <div className="ui-card w-full max-w-md overflow-hidden shadow-2xl">
        <div className="border-b border-hotel-border px-5 py-4">
          <p className="type-meta text-muted">Captured</p>
          <h2
            id="debrief-result-title"
            className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
          >
            Debrief saved
          </h2>
        </div>

        <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-5 py-4">
          {result.ai_summary ? (
            <p className="text-sm leading-relaxed text-foreground">
              {result.ai_summary}
            </p>
          ) : null}

          {tasks.length > 0 ? (
            <div>
              <p className="pre-meeting-card__label">Action items</p>
              <ul className="pre-meeting-card__questions">
                {tasks.map((task) => (
                  <li key={task.title}>{task.title}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {notes.length > 0 ? (
            <div>
              <p className="pre-meeting-card__label">Personal notes</p>
              <ul className="pre-meeting-card__questions">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.mentioned_contacts.length > 0 ? (
            <p className="text-sm text-muted">
              Mentioned: {result.mentioned_contacts.join(", ")}
            </p>
          ) : null}

          {tasks.length === 0 && notes.length === 0 && !result.ai_summary ? (
            <p className="text-sm text-muted">
              Saved to the contact. No extra follow-ups extracted.
            </p>
          ) : null}
        </div>

        <div className="border-t border-hotel-border px-5 py-4">
          <button
            type="button"
            onClick={onDone}
            className="ui-btn-green flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
