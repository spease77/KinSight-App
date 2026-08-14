"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DiscardChangesPopover } from "@/components/DiscardChangesPopover";

interface MeetingModalCloseButtonProps {
  hasChanges: boolean;
  disabled?: boolean;
  onClose: () => void;
  onDiscard: () => void;
  ariaLabel?: string;
}

export function MeetingModalCloseButton({
  hasChanges,
  disabled = false,
  onClose,
  onDiscard,
  ariaLabel = "Cancel",
}: MeetingModalCloseButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleClick = () => {
    if (disabled) return;

    if (hasChanges) {
      setPopoverOpen(true);
      return;
    }

    onClose();
  };

  const handleDiscard = () => {
    setPopoverOpen(false);
    onDiscard();
  };

  return (
    <DiscardChangesPopover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      onDiscard={handleDiscard}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-white transition-all duration-200 hover:bg-zinc-500 active:scale-95 disabled:opacity-40"
        aria-label={ariaLabel}
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </DiscardChangesPopover>
  );
}
