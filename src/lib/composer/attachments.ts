export const COMPOSER_MAX_ATTACHMENTS = 5;
export const COMPOSER_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const COMPOSER_MAX_FILE_BYTES = 15 * 1024 * 1024;

export type ComposerAttachmentPreview = {
  id: string;
  file: File;
  previewUrl?: string;
};

export function filesToFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt.files;
}

export function validateComposerFiles(
  incoming: File[],
  existingCount: number
): { ok: true; files: File[] } | { ok: false; error: string } {
  if (incoming.length === 0) {
    return { ok: false, error: "No file was selected." };
  }

  const remaining = COMPOSER_MAX_ATTACHMENTS - existingCount;
  if (remaining <= 0) {
    return {
      ok: false,
      error: `You can attach up to ${COMPOSER_MAX_ATTACHMENTS} files per message.`,
    };
  }

  const accepted = incoming.slice(0, remaining);

  for (const file of accepted) {
    const isImage = file.type.startsWith("image/");
    const maxBytes = isImage ? COMPOSER_MAX_IMAGE_BYTES : COMPOSER_MAX_FILE_BYTES;
    if (file.size > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      return {
        ok: false,
        error: `"${file.name}" is too large (max ${limitMb} MB).`,
      };
    }
  }

  return { ok: true, files: accepted };
}

export function createAttachmentPreviews(
  files: File[]
): ComposerAttachmentPreview[] {
  return files.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    previewUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined,
  }));
}

export function revokeAttachmentPreviews(
  previews: ComposerAttachmentPreview[]
): void {
  for (const preview of previews) {
    if (preview.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl);
    }
  }
}
