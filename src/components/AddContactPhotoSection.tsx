"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContactAvatar } from "@/components/ContactAvatar";
import { ContactAvatarCropModal } from "@/components/ContactAvatarCropModal";
import { ContactPhotoActionSheet } from "@/components/ContactPhotoActionSheet";
import { readClipboardImageBlob } from "@/lib/contacts/avatar-crop";
import { fetchRemoteAvatarBlob } from "@/lib/contacts/contact-avatar-client";
import type { ContactSortField } from "@/lib/contacts/sort-contacts";
import { composeContactName } from "@/types/contact-profile";

export type AddContactPhotoActions = {
  openOptions: () => void;
  openCropWithBlob: (blob: Blob) => void;
  getPendingBlob: () => Blob | null;
};

interface AddContactPhotoSectionProps {
  firstName: string;
  lastName: string;
  sortBy: ContactSortField;
  onReady?: (actions: AddContactPhotoActions) => void;
  onPhotoDirtyChange?: (dirty: boolean) => void;
}

type CropState = {
  previewUrl: string;
  blob: Blob;
};

export function AddContactPhotoSection({
  firstName,
  lastName,
  sortBy,
  onReady,
  onPhotoDirtyChange,
}: AddContactPhotoSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cropPreviewRef = useRef<string | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [canPasteFromClipboard, setCanPasteFromClipboard] = useState(false);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUrlSheetOpen, setIsUrlSheetOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const displayName =
    composeContactName({ firstName, lastName }) || "New contact";

  const revokePreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const setPendingPhoto = useCallback(
    (blob: Blob) => {
      pendingBlobRef.current = blob;
      revokePreview(previewUrl);
      const nextPreviewUrl = URL.createObjectURL(blob);
      setPreviewUrl(nextPreviewUrl);
      onPhotoDirtyChange?.(true);
    },
    [onPhotoDirtyChange, previewUrl, revokePreview]
  );

  const clearPendingPhoto = useCallback(() => {
    pendingBlobRef.current = null;
    revokePreview(previewUrl);
    setPreviewUrl(null);
    onPhotoDirtyChange?.(false);
  }, [onPhotoDirtyChange, previewUrl, revokePreview]);

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
      revokePreview(cropPreviewRef.current);
      const nextPreviewUrl = URL.createObjectURL(blob);
      cropPreviewRef.current = nextPreviewUrl;
      setCropState({ previewUrl: nextPreviewUrl, blob });
    },
    [revokePreview]
  );

  const openOptions = useCallback(() => {
    setError(null);
    setIsActionSheetOpen(true);
  }, []);

  const getPendingBlob = useCallback(() => pendingBlobRef.current, []);

  useEffect(() => {
    onReady?.({ openOptions, openCropWithBlob, getPendingBlob });
  }, [getPendingBlob, onReady, openCropWithBlob, openOptions]);

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
      revokePreview(cropPreviewRef.current);
      revokePreview(previewUrl);
    };
  }, [previewUrl, revokePreview]);

  const closeCrop = useCallback(() => {
    revokePreview(cropPreviewRef.current);
    cropPreviewRef.current = null;
    setCropState(null);
  }, [revokePreview]);

  const handleSaveCrop = (croppedBlob: Blob) => {
    if (croppedBlob.size > 5 * 1024 * 1024) {
      setError("Cropped image must be 5 MB or smaller.");
      closeCrop();
      return;
    }

    setPendingPhoto(croppedBlob);
    closeCrop();
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    openCropWithBlob(file);
  };

  const handleSaveImageUrl = async () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) {
      setError("Paste an image URL first.");
      return;
    }

    setIsLoadingUrl(true);
    setError(null);

    try {
      const result = await fetchRemoteAvatarBlob(trimmed);
      if (!result.blob) {
        setError(result.error ?? "Could not download that image URL.");
        return;
      }
      setImageUrl("");
      setIsUrlSheetOpen(false);
      openCropWithBlob(result.blob);
    } catch {
      setError("Could not download that image URL.");
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleRemovePhoto = () => {
    setIsActionSheetOpen(false);
    clearPendingPhoto();
  };

  const hasPhoto = Boolean(previewUrl);

  return (
    <div className="contact-detail-hero__photo contact-detail-hero__photo--edit flex shrink-0 flex-col items-center">
      <div className="relative shrink-0">
        <ContactAvatar
          name={displayName}
          sortBy={sortBy}
          firstName={firstName}
          lastName={lastName}
          avatarUrl={previewUrl}
          placeholder="silhouette"
          size="hero"
        />
      </div>

      <button
        type="button"
        onClick={openOptions}
        className="contact-detail-hero__photo-edit-pill"
      >
        {hasPhoto ? "Edit" : "Add Photo"}
      </button>

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
        onPasteImageUrl={() => {
          setIsActionSheetOpen(false);
          setError(null);
          setIsUrlSheetOpen(true);
        }}
        onChoosePhoto={() => {
          setIsActionSheetOpen(false);
          inputRef.current?.click();
        }}
        onRemovePhoto={handleRemovePhoto}
      />

      {isUrlSheetOpen ? (
        <div
          className="contact-photo-action-sheet__overlay contact-photo-action-sheet__overlay--open"
          role="dialog"
          aria-modal="true"
          aria-label="Paste image URL"
          onClick={() => !isLoadingUrl && setIsUrlSheetOpen(false)}
        >
          <div
            className="contact-photo-url-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="contact-photo-url-sheet__title">Paste image URL</p>
            <input
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…"
              className="contact-photo-url-sheet__input"
              disabled={isLoadingUrl}
            />
            <button
              type="button"
              className="contact-photo-url-sheet__save"
              onClick={() => void handleSaveImageUrl()}
              disabled={isLoadingUrl}
            >
              {isLoadingUrl ? "Loading…" : "Use this photo"}
            </button>
            <button
              type="button"
              className="contact-photo-action-sheet__cancel"
              onClick={() => setIsUrlSheetOpen(false)}
              disabled={isLoadingUrl}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {cropState && (
        <ContactAvatarCropModal
          imageUrl={cropState.previewUrl}
          isSaving={false}
          onCancel={closeCrop}
          onSave={handleSaveCrop}
        />
      )}
    </div>
  );
}
