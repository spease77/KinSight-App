"use client";

import type { CSSProperties } from "react";
import { Mic } from "lucide-react";
import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";
import {
  checkMicrophoneEnvironment,
  parseMicrophoneAccessError,
  requestMicrophoneStream,
} from "@/lib/audio/voice-support";

interface MicrophoneButtonProps {
  isRecording: boolean;
  isSpeaking?: boolean;
  isBusy?: boolean;
  /** Called to stop recording, or to start with a user-gesture-acquired stream. */
  onToggle: (stream?: MediaStream) => void;
  onMicAccessFailure?: (failure: MicrophoneAccessFailure) => void;
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

function ListeningDots({ variant }: { variant: "hero" | "compact" }) {
  const gap = variant === "hero" ? "gap-1.5 sm:gap-2" : "gap-1";
  const dotClass =
    variant === "hero"
      ? "mic-listening-dot mic-listening-dot--hero"
      : "mic-listening-dot mic-listening-dot--compact";

  return (
    <div
      className={`flex items-center justify-center ${gap}`}
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={dotClass}
          style={{ animationDelay: `${index * 0.14}s` }}
        />
      ))}
    </div>
  );
}

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
    ? `rgba(74, 222, 159, ${opacity.toFixed(2)})`
    : `color-mix(in srgb, var(--accent-mic) ${Math.round(opacity * 45)}%, transparent)`;

  return {
    shell: {
      transform: `scale(${scale})`,
      boxShadow: isRecording || intensity > 0
        ? `0 0 ${blur.toFixed(1)}px ${spread.toFixed(1)}px ${glowColor}`
        : undefined,
    },
  };
}

function MicToggleControl({
  isRecording,
  isBusy = false,
  onToggle,
  onMicAccessFailure,
  disabled = false,
  variant = "hero",
  volumeLevel = 0,
}: Omit<MicrophoneButtonProps, "isSpeaking" | "variant"> & {
  variant?: "hero" | "compact";
}) {
  const sizes = SIZE_CLASSES[variant];
  const { shell } = getMicVolumePresentation(volumeLevel, isRecording, variant);

  const handleClick = () => {
    if (disabled || isBusy) return;

    if (isRecording) {
      onToggle();
      return;
    }

    const environment = checkMicrophoneEnvironment();
    if (!environment.ok) {
      onMicAccessFailure?.(environment.failure);
      return;
    }

    // Invoke getUserMedia synchronously on the tap/click call stack (iOS Safari).
    void requestMicrophoneStream().then(
      (stream) => onToggle(stream),
      (error) => onMicAccessFailure?.(parseMicrophoneAccessError(error))
    );
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center bg-transparent ${sizes.wrapper}`}
    >
      <span
        className={`mic-ring pointer-events-none absolute rounded-full border ${
          sizes.ring
        } ${
          isRecording
            ? "mic-ring-recording mic-ring-fast"
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
              ? "mic-ring-recording mic-ring-recording--soft mic-ring-fast"
              : "border-accent-mic/35"
          }`}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isBusy}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        aria-pressed={isRecording}
        style={shell}
        className={`mic-button relative z-10 flex items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${sizes.button} ${VOLUME_TRANSITION_CLASS}`}
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
            <ListeningDots variant={variant} />
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
  onMicAccessFailure,
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
        onMicAccessFailure={onMicAccessFailure}
        disabled={disabled}
        variant="compact"
        volumeLevel={volumeLevel}
      />
    );
  }

  return (
    <div className="mic-hero flex w-full flex-col items-center gap-6 bg-transparent">
      <div className="mic-hero-spotlight relative flex items-center justify-center bg-transparent">
        <MicToggleControl
          isRecording={isRecording}
          isBusy={isBusy}
          onToggle={onToggle}
          onMicAccessFailure={onMicAccessFailure}
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
