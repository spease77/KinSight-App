"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clipboard, Pencil } from "lucide-react";
import { AssistantMessageText } from "@/components/AssistantMessageText";

interface AssistantMessageBubbleProps {
  messageId: string;
  text: string;
  onUpdateText?: (messageId: string, newText: string) => void;
  editDisabled?: boolean;
}

export function AssistantMessageBubble({
  messageId,
  text,
  onUpdateText,
  editDisabled = false,
}: AssistantMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(text);
    }
  }, [text, isEditing]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    },
    []
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some mobile contexts.
    }
  }, [text]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onUpdateText?.(messageId, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraft(text);
    setIsEditing(false);
  };

  return (
    <div className="w-full px-0.5 py-1 type-editorial text-sm text-foreground">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(12, Math.max(3, draft.split("\n").length + 1))}
            className="w-full resize-y rounded-lg border border-border-green/30 bg-main/60 px-2.5 py-2 text-sm text-foreground placeholder:text-muted focus:border-border-green/60 focus:outline-none"
            aria-label="Edit assistant response"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.trim()}
              className="rounded-md bg-accent-green-muted px-2.5 py-1 text-xs font-medium text-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-1 py-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <AssistantMessageText text={text} />
          <div className="mt-3 flex items-center gap-1 pt-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex h-7 items-center gap-1 rounded-md px-1.5 text-muted transition-colors hover:bg-main/50 hover:text-foreground"
                aria-label={copied ? "Copied" : "Copy response"}
              >
                {copied ? (
                  <>
                    <Check
                      className="h-3.5 w-3.5 text-accent-green"
                      strokeWidth={2}
                    />
                    <span className="text-[11px] font-medium text-accent-green">
                      Copied!
                    </span>
                  </>
                ) : (
                  <Clipboard className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
              {onUpdateText && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={editDisabled}
                  className="flex h-7 items-center rounded-md px-1.5 text-muted transition-colors hover:bg-main/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Edit response"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
