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
        className="edit-contact-header__btn edit-contact-header__btn--cancel"
        aria-label={ariaLabel}
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </DiscardChangesPopover>
  );
}
