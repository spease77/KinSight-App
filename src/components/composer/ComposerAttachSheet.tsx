"use client";

import { useEffect, useState } from "react";

interface ComposerAttachSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadPhoto: () => void;
  onTakePhoto: () => void;
  onUploadFile: () => void;
}

export function ComposerAttachSheet({
  isOpen,
  onClose,
  onUploadPhoto,
  onTakePhoto,
  onUploadFile,
}: ComposerAttachSheetProps) {
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
      aria-label="Add to message"
      onClick={onClose}
    >
      <div
        className={`contact-photo-action-sheet ${
          entered ? "contact-photo-action-sheet--open" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="contact-photo-action-sheet__group">
          <button
            type="button"
            className="contact-photo-action-sheet__option"
            onClick={onUploadPhoto}
          >
            Upload photo
          </button>
          <button
            type="button"
            className="contact-photo-action-sheet__option"
            onClick={onTakePhoto}
          >
            Take photo
          </button>
          <button
            type="button"
            className="contact-photo-action-sheet__option"
            onClick={onUploadFile}
          >
            Upload file
          </button>
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
