let speechUnlocked = false;
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentAbortController: AbortController | null = null;
let currentPlayResolve: ((value: SpeakResult) => void) | null = null;
let currentWebAudioSource: AudioBufferSourceNode | null = null;
let pendingSpeechBlob: Blob | null = null;

let sharedAudioContext: AudioContext | null = null;

/** Minimal silent WAV — played during a user gesture to unlock iOS Safari audio. */
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export type SpeakResult =
  | { ok: true }
  | { ok: false; reason: "aborted" | "api_error" | "autoplay_blocked" };

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined";
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }

  return sharedAudioContext;
}

function configureMobileAudio(audio: HTMLAudioElement): void {
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.preload = "auto";
}

/** Call during a user tap/click so later audio playback is allowed by the browser. */
export function unlockSpeechSynthesis(): void {
  if (typeof window === "undefined") return;

  const ctx = sharedAudioContext ?? getAudioContext();
  if (ctx) {
    void ctx.resume().catch(() => undefined);
  }

  const silent = new Audio(SILENT_WAV_DATA_URI);
  configureMobileAudio(silent);
  silent.volume = 0.01;
  silent.playsInline = true;

  void silent
    .play()
    .then(() => {
      speechUnlocked = true;
    })
    .catch(() => {
      // Keep speechUnlocked false until a user-gesture play succeeds.
    })
    .finally(() => {
      silent.pause();
      silent.removeAttribute("src");
      silent.load();
    });
}

function stopWebAudio(): void {
  if (!currentWebAudioSource) return;

  try {
    currentWebAudioSource.stop();
  } catch {
    // already stopped
  }
  currentWebAudioSource.disconnect();
  currentWebAudioSource = null;
}

function cleanupAudio(): void {
  stopWebAudio();

  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function finishPlayback(resolve: (value: SpeakResult) => void, result: SpeakResult): void {
  if (currentPlayResolve === resolve) {
    currentPlayResolve = null;
  }
  cleanupAudio();
  resolve(result);
}

async function playWithWebAudio(blob: Blob): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  unlockSpeechSynthesis();

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

    return await new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentWebAudioSource = source;

      source.onended = () => {
        if (currentWebAudioSource === source) {
          currentWebAudioSource = null;
        }
        resolve(true);
      };

      source.start(0);
    });
  } catch {
    return false;
  }
}

async function playBlob(blob: Blob): Promise<SpeakResult> {
  unlockSpeechSynthesis();

  currentObjectUrl = URL.createObjectURL(blob);
  currentAudio = new Audio(currentObjectUrl);
  configureMobileAudio(currentAudio);

  const elementResult = await new Promise<SpeakResult>((resolve) => {
    if (!currentAudio) {
      resolve({ ok: false, reason: "aborted" });
      return;
    }

    const audio = currentAudio;
    currentPlayResolve = resolve;

    audio.onended = () => {
      finishPlayback(resolve, { ok: true });
    };

    audio.onerror = () => {
      finishPlayback(resolve, { ok: false, reason: "autoplay_blocked" });
    };

    void audio.play().catch(() => {
      finishPlayback(resolve, { ok: false, reason: "autoplay_blocked" });
    });
  });

  if (elementResult.ok) {
    pendingSpeechBlob = null;
    return elementResult;
  }

  cleanupAudio();

  const webAudioOk = await playWithWebAudio(blob);
  if (webAudioOk) {
    pendingSpeechBlob = null;
    return { ok: true };
  }

  pendingSpeechBlob = blob;
  return { ok: false, reason: "autoplay_blocked" };
}

/** Speak via /api/speak (ElevenLabs when configured, else OpenAI). No browser fallback. */
export async function speakText(text: string): Promise<SpeakResult> {
  if (!text.trim() || typeof window === "undefined") {
    return { ok: false, reason: "aborted" };
  }

  stopSpeaking();

  const abortController = new AbortController();
  currentAbortController = abortController;

  let response: Response;
  try {
    response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: abortController.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, reason: "aborted" };
    }
    throw err;
  } finally {
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }
  }

  if (abortController.signal.aborted) {
    return { ok: false, reason: "aborted" };
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const json = JSON.parse(body) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // use raw body
    }
    console.error("TTS failed:", message);
    return { ok: false, reason: "api_error" };
  }

  const blob = await response.blob();
  pendingSpeechBlob = blob;

  if (abortController.signal.aborted) {
    return { ok: false, reason: "aborted" };
  }

  return playBlob(blob);
}

export function stopSpeaking(): void {
  currentAbortController?.abort();
  currentAbortController = null;

  if (currentPlayResolve) {
    const resolve = currentPlayResolve;
    currentPlayResolve = null;
    cleanupAudio();
    resolve({ ok: false, reason: "aborted" });
    return;
  }

  cleanupAudio();
}

