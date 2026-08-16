"use client";

import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";
import {
  getMicrophonePermissionInstructions,
  microphoneFailureTitle,
} from "@/lib/audio/voice-support";

interface MicPermissionModalProps {
  failure: MicrophoneAccessFailure;
  onDismiss: () => void;
}

export function MicPermissionModal({ failure, onDismiss }: MicPermissionModalProps) {
  const instructions = failure.showSettingsGuide
    ? getMicrophonePermissionInstructions()
    : [];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mic-permission-title"
      onClick={onDismiss}
    >
      <div
        className="ui-card w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-5">
          <h2
            id="mic-permission-title"
            className="font-sans text-xl font-normal tracking-tight text-foreground"
          >
            {microphoneFailureTitle(failure.reason)}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{failure.message}</p>

          {instructions.length > 0 ? (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
              {instructions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
        </div>

        <div className="border-t border-border-subtle px-5 py-4">
          <button
            type="button"
            onClick={onDismiss}
            className="ui-btn-outline-green w-full px-4 py-3 text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
