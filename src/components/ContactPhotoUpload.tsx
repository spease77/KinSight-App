"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContactDetail } from "@/types/contact";
import { ContactAvatar } from "@/components/ContactAvatar";
import { ContactAvatarCropModal } from "@/components/ContactAvatarCropModal";
import { ContactPhotoActionSheet } from "@/components/ContactPhotoActionSheet";
import {
  readClipboardImageBlob,
} from "@/lib/contacts/avatar-crop";
import {
  removeContactAvatar,
  uploadContactAvatarBlob,
} from "@/lib/contacts/contact-avatar-client";
import type { ContactSortField } from "@/lib/contacts/sort-contacts";

export type ContactPhotoActions = {
  openOptions: () => void;
  openCropWithBlob: (blob: Blob) => void;
};

interface ContactPhotoUploadProps {
  contact: ContactDetail;
  sortBy: ContactSortField;
  variant?: "detail" | "edit";
  onContactUpdate?: (contact: ContactDetail) => void;
  onEditReady?: (actions: ContactPhotoActions) => void;
}

type CropState = {
  previewUrl: string;
  blob: Blob;
};

export function ContactPhotoUpload({
  contact,
  sortBy,
  variant = "detail",
  onContactUpdate,
  onEditReady,
}: ContactPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cropPreviewRef = useRef<string | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [canPasteFromClipboard, setCanPasteFromClipboard] = useState(false);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPhoto = Boolean(contact.avatarUrl?.trim());

  const revokeCropPreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const openCropWithBlob = useCallback(
    (blob: Blob) => {
      if (!blob.type.startsWith("image/")) {
        setError("Clipboard does not contain a supported image.");
        return;
      }

      if (blob.size > 5 * 1024 * 1024) {
        setError("Image must be 5 MB or smaller.");
        return;
      }

      setError(null);
      setIsActionSheetOpen(false);
      revokeCropPreview(cropPreviewRef.current);
      const previewUrl = URL.createObjectURL(blob);
      cropPreviewRef.current = previewUrl;
      setCropState({ previewUrl, blob });
    },
    [revokeCropPreview]
  );

  const openOptions = useCallback(() => {
    if (isUploading) return;
    setError(null);
    setIsActionSheetOpen(true);
  }, [isUploading]);

  useEffect(() => {
    onEditReady?.({ openOptions, openCropWithBlob });
  }, [onEditReady, openCropWithBlob, openOptions]);

  useEffect(() => {
    if (!isActionSheetOpen) {
      setCanPasteFromClipboard(false);
      return;
    }

    void readClipboardImageBlob().then((blob) => {
      setCanPasteFromClipboard(blob !== null);
    });
  }, [isActionSheetOpen]);

  useEffect(() => {
    return () => {
      revokeCropPreview(cropPreviewRef.current);
    };
  }, [revokeCropPreview]);

  const closeCrop = useCallback(() => {
    revokeCropPreview(cropPreviewRef.current);
    cropPreviewRef.current = null;
    setCropState(null);
  }, [revokeCropPreview]);

  const handleSaveCrop = async (croppedBlob: Blob) => {
    if (croppedBlob.size > 5 * 1024 * 1024) {
      setError("Cropped image must be 5 MB or smaller.");
      closeCrop();
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadContactAvatarBlob(contact.id, croppedBlob);
      if (!result.contact) {
        setError(result.error ?? "Could not upload photo.");
        return;
      }
      onContactUpdate?.(result.contact);
      closeCrop();
    } catch {
      setError("Could not upload photo. Check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    const blob = await readClipboardImageBlob();
    if (!blob) {
      setError("No image found on clipboard.");
      setIsActionSheetOpen(false);
      return;
    }
    openCropWithBlob(blob);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    openCropWithBlob(file);
  };

  const handleRemovePhoto = async () => {
    setIsActionSheetOpen(false);
    setIsUploading(true);
    setError(null);

    try {
      const result = await removeContactAvatar(contact.id);
      if (!result.contact) {
        setError(result.error ?? "Could not remove photo.");
        return;
      }
      onContactUpdate?.(result.contact);
    } catch {
      setError("Could not remove photo. Check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const isEditVariant = variant === "edit";

  return (
    <div
      className={`contact-detail-hero__photo flex shrink-0 flex-col items-center ${
        isEditVariant ? "contact-detail-hero__photo--edit" : ""
      }`}
    >
      <div className="relative shrink-0">
        <ContactAvatar
          name={contact.name}
          sortBy={sortBy}
          firstName={contact.profile?.firstName}
          lastName={contact.profile?.lastName}
          avatarUrl={contact.avatarUrl}
          size="hero"
        />
        {isUploading && !cropState && isEditVariant && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40"
            aria-hidden
          >
            <span className="text-sm font-medium text-white">Uploading…</span>
          </div>
        )}
      </div>

      {isEditVariant && (
        <button
          type="button"
          onClick={openOptions}
          disabled={isUploading}
          className="contact-detail-hero__photo-edit-pill"
        >
          {isUploading ? "Uploading…" : "Edit"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload contact photo"
      />

      {error && (
        <p className="mt-2 max-w-xs text-center text-xs leading-snug text-red-300">
          {error}
        </p>
      )}

      <ContactPhotoActionSheet
        isOpen={isActionSheetOpen}
        hasPhoto={hasPhoto}
        canPasteFromClipboard={canPasteFromClipboard}
        onClose={() => setIsActionSheetOpen(false)}
        onPasteFromClipboard={() => void handlePasteFromClipboard()}
        onChoosePhoto={() => {
          setIsActionSheetOpen(false);
          inputRef.current?.click();
        }}
        onRemovePhoto={() => void handleRemovePhoto()}
      />

      {cropState && (
        <ContactAvatarCropModal
          imageUrl={cropState.previewUrl}
          isSaving={isUploading}
          onCancel={closeCrop}
          onSave={(blob) => void handleSaveCrop(blob)}
        />
      )}
    </div>
  );
}
