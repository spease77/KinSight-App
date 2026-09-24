import { unlockSpeechSynthesis } from "@/lib/audio/speech";
import { pickRecorderMimeType } from "@/lib/audio/recorder-mime";

export type VoiceUnsupportedReason =
  | "insecure_context"
  | "no_api"
  | "no_mime";

export type MicrophoneAccessFailureReason =
  | VoiceUnsupportedReason
  | "permission_denied"
  | "device_not_found"
  | "unknown";

export type VoiceSupportCheck = {
  supported: boolean;
  reason?: VoiceUnsupportedReason;
};

export type MicrophoneAccessFailure = {
  reason: MicrophoneAccessFailureReason;
  message: string;
  /** When true, show platform-specific settings instructions in a modal. */
  showSettingsGuide: boolean;
};

export function checkVoiceRecordingSupport(): VoiceSupportCheck {
  if (typeof window === "undefined") {
    return { supported: false, reason: "no_api" };
  }

  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    return { supported: false, reason: "insecure_context" };
  }

  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    return { supported: false, reason: "no_api" };
  }

  // iOS Safari may report no supported MIME types but still record via default MediaRecorder.
  if (!pickRecorderMimeType()) {
    return { supported: false, reason: "no_api" };
  }

  return { supported: true };
}

/** Sync feature checks only — does not request microphone permission. */
export function checkMicrophoneEnvironment():
  | { ok: true }
  | { ok: false; failure: MicrophoneAccessFailure } {
  if (typeof window === "undefined") {
    return {
      ok: false,
      failure: {
        reason: "no_api",
        message: voiceUnsupportedMessage("no_api"),
        showSettingsGuide: false,
      },
    };
  }

  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    return {
      ok: false,
      failure: {
        reason: "insecure_context",
        message: voiceUnsupportedMessage("insecure_context"),
        showSettingsGuide: false,
      },
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      failure: {
        reason: "no_api",
        message: voiceUnsupportedMessage("no_api"),
        showSettingsGuide: false,
      },
    };
  }

  return { ok: true };
}

let recordingAudioContext: AudioContext | null = null;
let activeCaptureStream: MediaStream | null = null;

export function isIosSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Keep a module-level reference so mobile Safari does not drop the capture early. */
export function retainActiveCaptureStream(stream: MediaStream): void {
  activeCaptureStream = stream;
}

export function releaseActiveCaptureStream(): void {
  activeCaptureStream?.getTracks().forEach((track) => track.stop());
  activeCaptureStream = null;
}

function getAudioContextConstructor():
  | (typeof AudioContext)
  | undefined {
  if (typeof window === "undefined") return undefined;

  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

/**
 * Create/resume AudioContext synchronously inside a user gesture (required on iOS Safari).
 */
export function unlockRecordingAudioFromUserGesture(): AudioContext | null {
  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return null;

  if (!recordingAudioContext || recordingAudioContext.state === "closed") {
    recordingAudioContext = new AudioCtx();
  }

  void recordingAudioContext.resume().catch((error) => {
    logVoiceDiagnostic("AudioContext.resume failed", error);
  });

  unlockSpeechSynthesis();
  return recordingAudioContext;
}

/** Shared AudioContext unlocked from the mic tap; used by the level visualizer. */
export function getRecordingAudioContext(): AudioContext | null {
  return recordingAudioContext;
}

export function logVoiceDiagnostic(context: string, error?: unknown): void {
  if (error !== undefined) {
    console.error(`[KinSight voice] ${context}`, error);
    return;
  }
  console.error(`[KinSight voice] ${context}`);
}

export function describeVoiceError(error: unknown): string {
  if (error instanceof DOMException) {
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function voiceFailureMessage(context: string, error?: unknown): string {
  logVoiceDiagnostic(context, error);
  const detail = error !== undefined ? describeVoiceError(error) : "";
  return detail ? `${context} (${detail})` : context;
}

/**
 * Request microphone access. Call only after `unlockRecordingAudioFromUserGesture`
 * in the same click/tap handler (required on iOS Safari).
 */
export function requestMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(
      new DOMException("getUserMedia is not available", "NotSupportedError")
    );
  }

  const preferred: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  };

  return navigator.mediaDevices.getUserMedia(preferred).catch((firstError) => {
    logVoiceDiagnostic("Preferred getUserMedia constraints failed", firstError);
    return navigator.mediaDevices.getUserMedia({ audio: true });
  });
}

/**
 * Unlock iOS audio + start mic capture in one user-gesture call stack.
 * `getUserMedia` is invoked synchronously when this function runs (required on iOS Safari).
 */
export function requestMicrophoneStreamFromUserGesture(): Promise<MediaStream> {
  unlockRecordingAudioFromUserGesture();
  const pending = requestMicrophoneStream();
  pending.then(
    (stream) => {
      retainActiveCaptureStream(stream);
    },
    () => {
      // Caller handles rejection; retain only on success.
    }
  );
  return pending;
}

export function parseMicrophoneAccessError(error: unknown): MicrophoneAccessFailure {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return {
        reason: "permission_denied",
        message:
          "Microphone access was blocked. Allow the mic in your browser or device settings, then try again.",
        showSettingsGuide: true,
      };
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return {
        reason: "device_not_found",
        message: "No microphone was found on this device.",
        showSettingsGuide: false,
      };
    }

    if (error.name === "SecurityError") {
      return {
        reason: "insecure_context",
        message: voiceUnsupportedMessage("insecure_context"),
        showSettingsGuide: false,
      };
    }
  }

  return {
    reason: "unknown",
    message: "Could not access the microphone. Please try again.",
    showSettingsGuide: false,
  };
}

export function voiceUnsupportedMessage(reason?: VoiceUnsupportedReason): string {
  switch (reason) {
    case "insecure_context":
      return "Microphone access requires a secure connection (HTTPS). Open KinSight using an https:// link, not an IP address or http:// URL.";
    case "no_mime":
      return "This browser cannot record audio. Try Safari or Chrome on iOS 17+, or type your question instead.";
    case "no_api":
      return "Audio recording is not available in this browser. Type your question in the box below.";
    default:
      return "Audio recording requires a modern browser with microphone support.";
  }
}

export function getMicrophonePermissionInstructions(): string[] {
  if (typeof navigator === "undefined") {
    return [
      "Allow microphone access in your browser settings.",
      "Reload the page and tap the mic again.",
    ];
  }

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    const browser = /CriOS/i.test(ua)
      ? "Chrome"
      : /FxiOS/i.test(ua)
        ? "Firefox"
        : "Safari";

    return [
      "Open the Settings app on your device.",
      browser === "Safari"
        ? "Go to Apps → Safari → Microphone and set to Allow."
        : `Go to Apps → ${browser} → Microphone and set to Allow.`,
      "Return to KinSight and tap the mic again.",
    ];
  }

  if (/Android/i.test(ua)) {
    return [
      "Tap the lock or site-info icon in your browser's address bar.",
      "Open Site settings, then set Microphone to Allow.",
      "Reload KinSight and tap the mic again.",
    ];
  }

  if (/Edg\//i.test(ua)) {
    return [
      "Click the lock icon in the address bar (or edge://settings/content/microphone).",
      "Set Microphone to Allow for this site.",
      "Reload the page and tap the mic again.",
    ];
  }

  if (/Firefox/i.test(ua)) {
    return [
      "Click the permissions icon in the address bar.",
      "Clear the blocked Microphone permission and set it to Allow.",
      "Reload the page and tap the mic again.",
    ];
  }

  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    return [
      "Open Safari → Settings for This Website (from the Safari menu).",
      "Set Microphone to Allow.",
      "Reload the page and tap the mic again.",
    ];
  }

  return [
    "Click the lock or site-info icon in your browser's address bar.",
    "Find Microphone and set it to Allow.",
    "Reload the page and tap the mic again.",
  ];
}

export function microphoneFailureTitle(reason: MicrophoneAccessFailureReason): string {
  switch (reason) {
    case "permission_denied":
      return "Microphone access blocked";
    case "insecure_context":
      return "Secure connection required";
    case "device_not_found":
      return "No microphone found";
    case "no_api":
      return "Recording unavailable";
    case "no_mime":
      return "Recording unavailable";
    default:
      return "Microphone error";
  }
}
