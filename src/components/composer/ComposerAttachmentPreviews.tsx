"use client";

import { FileText, X } from "lucide-react";
import type { ComposerAttachmentPreview } from "@/lib/composer/attachments";

interface ComposerAttachmentPreviewsProps {
  attachments: ComposerAttachmentPreview[];
  onRemove: (id: string) => void;
  compact?: boolean;
}

export function ComposerAttachmentPreviews({
  attachments,
  onRemove,
  compact = false,
}: ComposerAttachmentPreviewsProps) {
  if (attachments.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap gap-2 px-1 ${compact ? "pb-1" : "pb-2"}`}
      aria-label="Attachments"
    >
      {attachments.map((item) => (
        <div
          key={item.id}
          className="relative flex max-w-full items-center gap-2 rounded-xl border border-border-subtle bg-card px-2 py-1.5"
        >
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40">
              <FileText className="h-5 w-5 text-icon" strokeWidth={2} />
            </div>
          )}
          <span className="max-w-[9rem] truncate text-xs text-foreground">
            {item.file.name}
          </span>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label={`Remove ${item.file.name}`}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
