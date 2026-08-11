"use client";

import type { CSSProperties } from "react";
import { Ear, Mic } from "lucide-react";

interface MicrophoneButtonProps {
  isRecording: boolean;
  isSpeaking?: boolean;
  isBusy?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  variant?: "hero" | "compact";
  /** Real-time mic level from `useAudioVisualizer` (0–100). */
  volumeLevel?: number;
}

const SIZE_CLASSES = {
  hero: {
    wrapper: "py-4",
    ring: "h-44 w-44 sm:h-52 sm:w-52",
    button: "h-44 w-44 sm:h-52 sm:w-52",
    inner: "h-24 w-24 sm:h-28 sm:w-28",
    icon: "h-12 w-12 sm:h-14 sm:w-14",
  },
  compact: {
    wrapper: "",
    ring: "h-12 w-12",
    button: "h-11 w-11",
    inner: "h-6 w-6",
    icon: "h-4 w-4",
  },
} as const;

const VOLUME_TRANSITION_CLASS =
  "transition-[transform,box-shadow] duration-75 ease-out will-change-[transform,box-shadow]";

function getMicVolumePresentation(
  volumeLevel: number,
  isRecording: boolean,
  variant: "hero" | "compact"
): { shell: CSSProperties } {
  const intensity = isRecording
    ? Math.min(100, Math.max(0, volumeLevel)) / 100
    : 0;
  const scaleBoost = variant === "hero" ? 0.12 : 0.08;
  const scale = 1 + intensity * scaleBoost;

  const baseBlur = variant === "hero" ? 16 : 6;
  const maxBlur = variant === "hero" ? 52 : 20;
  const blur = baseBlur + intensity * (maxBlur - baseBlur);
  const spread = blur * 0.4;
  const opacity = 0.18 + intensity * 0.55;
  const glowColor = isRecording
    ? `color-mix(in srgb, var(--accent-green-bright) ${Math.round(opacity * 100)}%, transparent)`
    : `color-mix(in srgb, var(--accent-mic) ${Math.round(opacity * 45)}%, transparent)`;

  return {
    shell: {
      transform: `scale(${scale})`,
      boxShadow: `0 0 ${blur.toFixed(1)}px ${spread.toFixed(1)}px ${glowColor}`,
    },
  };
}

function MicToggleControl({
  isRecording,
  isBusy = false,
  onToggle,
  disabled = false,
  variant = "hero",
  volumeLevel = 0,
}: Omit<MicrophoneButtonProps, "isSpeaking" | "variant"> & {
  variant?: "hero" | "compact";
}) {
  const sizes = SIZE_CLASSES[variant];
  const { shell } = getMicVolumePresentation(volumeLevel, isRecording, variant);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${sizes.wrapper} ${VOLUME_TRANSITION_CLASS}`}
      style={shell}
    >
      <span
        className={`mic-ring pointer-events-none absolute rounded-full border ${
          sizes.ring
        } ${
          isRecording
            ? "border-accent-green-bright/50 mic-ring-fast"
            : "border-accent-mic/50"
        }`}
        aria-hidden="true"
      />
      {variant === "hero" && (
        <span
          className={`mic-ring mic-ring-delay pointer-events-none absolute rounded-full border ${
            sizes.ring
          } ${
            isRecording
              ? "border-accent-green-bright/35 mic-ring-fast"
              : "border-accent-mic/35"
          }`}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isBusy}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        aria-pressed={isRecording}
        className={`mic-button relative z-10 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${sizes.button}`}
      >
        <div
          className={`mic-shell absolute inset-0 rounded-full ${
            isRecording ? "mic-shell-recording" : ""
          }`}
        />

        <div
          className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-300 ${sizes.inner} ${
            isRecording ? "mic-inner-recording" : "mic-inner-idle"
          }`}
        >
          {isRecording ? (
            <Ear className={`${sizes.icon} text-foreground`} strokeWidth={2.25} />
          ) : (
            <Mic className={`${sizes.icon} text-foreground`} strokeWidth={2.25} />
          )}
        </div>
      </button>
    </div>
  );
}

export function MicrophoneButton({
  isRecording,
  isSpeaking = false,
  isBusy = false,
  onToggle,
  disabled = false,
  variant = "hero",
  volumeLevel = 0,
}: MicrophoneButtonProps) {
  if (variant === "compact") {
    return (
      <MicToggleControl
        isRecording={isRecording}
        isBusy={isBusy}
        onToggle={onToggle}
        disabled={disabled}
        variant="compact"
        volumeLevel={volumeLevel}
      />
    );
  }

  return (
    <div className="mic-hero flex w-full flex-col items-center gap-6">
      <div className="mic-hero-spotlight relative flex items-center justify-center">
        <MicToggleControl
          isRecording={isRecording}
          isBusy={isBusy}
          onToggle={onToggle}
          disabled={disabled}
          variant="hero"
          volumeLevel={volumeLevel}
        />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="max-w-sm font-sans text-lg font-normal tracking-tight text-foreground">
          {isBusy
            ? "Processing your note…"
            : isRecording
              ? "Listening…"
              : isSpeaking
                ? "Tap to interrupt"
                : "Summarize, ask, or schedule."}
        </p>

        {(isBusy || isRecording || isSpeaking) && (
          <p className="type-editorial max-w-xs text-sm text-muted">
            {isBusy ? (
              <span className="text-foreground">KinSight is on it</span>
            ) : isRecording ? (
              <span className="text-foreground">Tap again when you&apos;re done</span>
            ) : (
              <span className="text-foreground">Tap the mic to stop and add more</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
