export type OsVoiceSource = "siri" | "google" | "shortcut" | "unknown";

export type OsVoiceLaunchPayload = {
  command?: string;
  captureImmediately: boolean;
  source: OsVoiceSource;
};

const COMMAND_KEYS = ["voice_command", "kinsight_command", "command"] as const;
const CAPTURE_KEYS = ["voice_capture", "capture"] as const;
const SOURCE_KEYS = ["voice_source", "source"] as const;

function readFirst(params: URLSearchParams, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseSource(raw: string | undefined): OsVoiceSource {
  const normalized = raw?.toLowerCase();
  if (normalized === "siri") return "siri";
  if (normalized === "google" || normalized === "assistant") return "google";
  if (normalized === "shortcut") return "shortcut";
  return "unknown";
}

export function parseOsVoiceLaunch(
  searchParams: URLSearchParams
): OsVoiceLaunchPayload | null {
  const command = readFirst(searchParams, COMMAND_KEYS);
  const captureFlag = readFirst(searchParams, CAPTURE_KEYS);
  const source = parseSource(readFirst(searchParams, SOURCE_KEYS));

  const captureImmediately =
    captureFlag === "1" ||
    captureFlag === "true" ||
    captureFlag === "yes";

  if (!command && !captureImmediately) {
    return null;
  }

  return {
    command,
    captureImmediately: captureImmediately || Boolean(command),
    source,
  };
}

export function stripOsVoiceParams(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  for (const key of [
    ...COMMAND_KEYS,
    ...CAPTURE_KEYS,
    ...SOURCE_KEYS,
  ]) {
    next.delete(key);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}

/** Custom URL scheme handler payload — used when Capacitor/native shell is active. */
export function parseKinSightVoiceUrl(url: string): OsVoiceLaunchPayload | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "kinsight:") return null;

    const command =
      parsed.searchParams.get("command")?.trim() ||
      parsed.pathname.replace(/^\//, "").trim() ||
      undefined;

    return {
      command: command || undefined,
      captureImmediately: true,
      source: parseSource(parsed.searchParams.get("source") ?? undefined),
    };
  } catch {
    return null;
  }
}
