import type { OsVoiceLaunchPayload } from "@/lib/voice/os-voice-deeplink";

export type NativeBridgeStatus = {
  isNativeShell: boolean;
  platform: "ios" | "android" | "web";
};

type VoiceLaunchListener = (payload: OsVoiceLaunchPayload) => void;

const launchListeners = new Set<VoiceLaunchListener>();

function detectPlatform(): NativeBridgeStatus["platform"] {
  if (typeof window === "undefined") return "web";

  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

export function getNativeBridgeStatus(): NativeBridgeStatus {
  const capacitor = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;

  const isNativeShell = Boolean(capacitor?.isNativePlatform?.());
  const platform = isNativeShell
    ? (capacitor?.getPlatform?.() as NativeBridgeStatus["platform"]) ??
      detectPlatform()
    : detectPlatform();

  return { isNativeShell, platform };
}

export function subscribeNativeVoiceLaunch(
  listener: VoiceLaunchListener
): () => void {
  launchListeners.add(listener);
  return () => launchListeners.delete(listener);
}

export function emitNativeVoiceLaunch(payload: OsVoiceLaunchPayload): void {
  for (const listener of launchListeners) {
    listener(payload);
  }
}

/**
 * Called from Capacitor/AppDelegate when Siri or Google Assistant delivers a payload.
 * Wire this in native code via `window.KinSightNativeBridge.onVoiceLaunch(...)`.
 */
export function installNativeBridgeHandlers(): void {
  if (typeof window === "undefined") return;

  const bridge = {
    onVoiceLaunch: (payload: OsVoiceLaunchPayload) => {
      emitNativeVoiceLaunch(payload);
    },
    getStatus: getNativeBridgeStatus,
  };

  (
    window as Window & { KinSightNativeBridge?: typeof bridge }
  ).KinSightNativeBridge = bridge;
}
