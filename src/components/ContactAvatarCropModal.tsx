"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AVATAR_CROP_VIEWPORT_SIZE,
  computeAvatarBaseScale,
  exportCircularAvatarCrop,
  type AvatarCropTransform,
} from "@/lib/contacts/avatar-crop";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface ContactAvatarCropModalProps {
  imageUrl: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}

export function ContactAvatarCropModal({
  imageUrl,
  isSaving = false,
  onCancel,
  onSave,
}: ContactAvatarCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [entered, setEntered] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const pinchStateRef = useRef<{
    distance: number;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setBaseScale(
        computeAvatarBaseScale(img.naturalWidth, img.naturalHeight)
      );
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const displayScale = baseScale * zoom;
  const drawWidth = imageSize.width * displayScale;
  const drawHeight = imageSize.height * displayScale;
  const imageLeft =
    AVATAR_CROP_VIEWPORT_SIZE / 2 + pan.x - drawWidth / 2;
  const imageTop =
    AVATAR_CROP_VIEWPORT_SIZE / 2 + pan.y - drawHeight / 2;

  const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSaving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPan({
      x: drag.panX + event.clientX - drag.startX,
      y: drag.panY + event.clientY - drag.startY,
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const a = event.touches[0]!;
      const b = event.touches[1]!;
      const distance = Math.hypot(
        b.clientX - a.clientX,
        b.clientY - a.clientY
      );
      pinchStateRef.current = { distance, zoom };
      dragStateRef.current = null;
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchStateRef.current) return;
    const a = event.touches[0]!;
    const b = event.touches[1]!;
    const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const ratio = distance / pinchStateRef.current.distance;
    setZoom(clampZoom(pinchStateRef.current.zoom * ratio));
    event.preventDefault();
  };

  const handleTouchEnd = () => {
    pinchStateRef.current = null;
  };

  const handleSave = useCallback(async () => {
    if (!imageSize.width || !imageSize.height || isSaving) return;

    const transform: AvatarCropTransform = {
      baseScale,
      zoom,
      panX: pan.x,
      panY: pan.y,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
    };

    const blob = await exportCircularAvatarCrop(imageUrl, transform);
    onSave(blob);
  }, [
    baseScale,
    imageSize.height,
    imageSize.width,
    imageUrl,
    isSaving,
    onSave,
    pan.x,
    pan.y,
    zoom,
  ]);

  return (
    <div
      className={`contact-avatar-crop__overlay ${
        entered ? "contact-avatar-crop__overlay--open" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-avatar-crop-title"
    >
      <div
        className={`contact-avatar-crop__modal ${
          entered ? "contact-avatar-crop__modal--open" : ""
        }`}
      >
        <h2 id="contact-avatar-crop-title" className="contact-avatar-crop__title">
          Adjust Photo
        </h2>
        <p className="contact-avatar-crop__hint">
          Drag to reposition. Pinch or use the slider to zoom.
        </p>

        <div
          className="contact-avatar-crop__viewport"
          style={{
            width: AVATAR_CROP_VIEWPORT_SIZE,
            height: AVATAR_CROP_VIEWPORT_SIZE,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {imageSize.width > 0 && (
            <img
              src={imageUrl}
              alt="Photo preview"
              className="contact-avatar-crop__image"
              draggable={false}
              style={{
                width: drawWidth,
                height: drawHeight,
                left: imageLeft,
                top: imageTop,
              }}
            />
          )}
          <div className="contact-avatar-crop__mask" aria-hidden />
        </div>

        <label className="contact-avatar-crop__slider-label">
          <span>Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={isSaving}
            onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
            className="contact-avatar-crop__slider"
          />
        </label>

        <div className="contact-avatar-crop__actions">
          <button
            type="button"
            className="contact-avatar-crop__btn contact-avatar-crop__btn--secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="contact-avatar-crop__btn contact-avatar-crop__btn--primary"
            onClick={() => void handleSave()}
            disabled={isSaving || imageSize.width === 0}
          >
            {isSaving ? "Saving…" : "Save Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
