"use client";

import { useEffect, useState } from "react";

interface ContactPhotoActionSheetProps {
  isOpen: boolean;
  hasPhoto: boolean;
  canPasteFromClipboard: boolean;
  onClose: () => void;
  onPasteFromClipboard: () => void;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
}

export function ContactPhotoActionSheet({
  isOpen,
  hasPhoto,
  canPasteFromClipboard,
  onClose,
  onPasteFromClipboard,
  onChoosePhoto,
  onRemovePhoto,
}: ContactPhotoActionSheetProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`contact-photo-action-sheet__overlay ${
        entered ? "contact-photo-action-sheet__overlay--open" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo options"
      onClick={onClose}
    >
      <div
        className={`contact-photo-action-sheet ${
          entered ? "contact-photo-action-sheet--open" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="contact-photo-action-sheet__group">
          {canPasteFromClipboard && (
            <button
              type="button"
              className="contact-photo-action-sheet__option"
              onClick={onPasteFromClipboard}
            >
              Paste Image from Clipboard
            </button>
          )}
          <button
            type="button"
            className="contact-photo-action-sheet__option"
            onClick={onChoosePhoto}
          >
            Choose from Photos / Upload Attachment
          </button>
          {hasPhoto && (
            <button
              type="button"
              className="contact-photo-action-sheet__option contact-photo-action-sheet__option--destructive"
              onClick={onRemovePhoto}
            >
              Remove Photo
            </button>
          )}
        </div>
        <button
          type="button"
          className="contact-photo-action-sheet__cancel"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
