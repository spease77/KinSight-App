export const AVATAR_CROP_VIEWPORT_SIZE = 280;
export const AVATAR_CROP_OUTPUT_SIZE = 512;

export type AvatarCropTransform = {
  baseScale: number;
  zoom: number;
  panX: number;
  panY: number;
  imageWidth: number;
  imageHeight: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

export function computeAvatarBaseScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize = AVATAR_CROP_VIEWPORT_SIZE
): number {
  if (imageWidth <= 0 || imageHeight <= 0) return 1;
  return Math.max(viewportSize / imageWidth, viewportSize / imageHeight);
}

export async function exportCircularAvatarCrop(
  imageSrc: string,
  transform: AvatarCropTransform,
  viewportSize = AVATAR_CROP_VIEWPORT_SIZE,
  outputSize = AVATAR_CROP_OUTPUT_SIZE
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas.");

  const scaleFactor = outputSize / viewportSize;
  const displayScale = transform.baseScale * transform.zoom;
  const drawWidth = transform.imageWidth * displayScale * scaleFactor;
  const drawHeight = transform.imageHeight * displayScale * scaleFactor;
  const drawX =
    (viewportSize / 2 + transform.panX - (transform.imageWidth * displayScale) / 2) *
    scaleFactor;
  const drawY =
    (viewportSize / 2 + transform.panY - (transform.imageHeight * displayScale) / 2) *
    scaleFactor;

  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
  });

  if (!blob) throw new Error("Could not export cropped image.");
  return blob;
}

export async function readClipboardImageBlob(): Promise<Blob | null> {
  if (!navigator.clipboard?.read) return null;

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (imageType) {
        return await item.getType(imageType);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function imageBlobFromClipboardEvent(
  event: ClipboardEvent
): Blob | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }

  return null;
}
