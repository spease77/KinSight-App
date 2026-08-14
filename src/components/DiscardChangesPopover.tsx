"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DiscardChangesPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  children: ReactNode;
}

export function DiscardChangesPopover({
  open,
  onOpenChange,
  onDiscard,
  children,
}: DiscardChangesPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} className="pointer-events-auto relative">
      {children}

      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.5rem)] z-[60] w-64 rounded-xl border border-border-green bg-card p-4 shadow-xl"
          role="alertdialog"
          aria-live="polite"
        >
          <p className="text-sm leading-relaxed text-foreground">
            Are you sure you want to discard changes?
          </p>
          <button
            type="button"
            onClick={onDiscard}
            className="mt-3 text-sm font-medium text-red-500 transition-colors hover:underline"
          >
            Discard Changes
          </button>
        </div>
      ) : null}
    </div>
  );
}
