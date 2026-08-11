import { pickRecorderMimeType } from "@/lib/audio/recorder-mime";

export type VoiceUnsupportedReason =
  | "insecure_context"
  | "no_api"
  | "no_mime";

export type VoiceSupportCheck = {
  supported: boolean;
  reason?: VoiceUnsupportedReason;
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

  if (!pickRecorderMimeType()) {
    return { supported: false, reason: "no_mime" };
  }

  return { supported: true };
}

export function voiceUnsupportedMessage(reason?: VoiceUnsupportedReason): string {
  switch (reason) {
    case "insecure_context":
      return "Microphone requires HTTPS on your phone. Use the https://…trycloudflare.com link, not the IP address.";
    case "no_mime":
      return "This browser cannot record audio. Try Safari or Chrome on iOS 17+, or type your question instead.";
    case "no_api":
      return "Audio recording is not available in this browser. Type your question in the box below.";
    default:
      return "Audio recording requires a modern browser with microphone support.";
  }
}
