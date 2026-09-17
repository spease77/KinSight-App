import { logVoiceDiagnostic } from "@/lib/audio/voice-support";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
  message?: string;
};

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionInstance)
  | undefined {
  if (typeof window === "undefined") return undefined;

  const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition;
}

export function isLiveSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionConstructor());
}

export type LiveSpeechCallbacks = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: unknown) => void;
  /** Return true to restart after the engine ends while still recording. */
  shouldRestart?: () => boolean;
};

export type LiveSpeechSession = {
  stop: () => void;
  getTranscript: () => string;
};

export function startLiveSpeechRecognition(
  callbacks: LiveSpeechCallbacks
): LiveSpeechSession | null {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  if (!SpeechRecognition) return null;

  const finalParts: string[] = [];
  let recognition: SpeechRecognitionInstance | null = null;
  let stopped = false;

  const buildDisplay = (interim: string) => {
    const committed = finalParts.join(" ").trim();
    if (!committed) return interim.trim();
    if (!interim.trim()) return committed;
    return `${committed} ${interim.trim()}`;
  };

  const startEngine = () => {
    if (stopped) return;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim() ?? "";
        if (!text) continue;

        if (result.isFinal) {
          finalParts.push(text);
          callbacks.onFinal(text);
        } else {
          interim = `${interim} ${text}`.trim();
        }
      }

      callbacks.onInterim(buildDisplay(interim));
    };

    recognition.onerror = (event) => {
      const detail =
        "error" in event
          ? `${(event as SpeechRecognitionErrorEvent).error}${
              (event as SpeechRecognitionErrorEvent).message
                ? `: ${(event as SpeechRecognitionErrorEvent).message}`
                : ""
            }`
          : "unknown";
      logVoiceDiagnostic("Live speech recognition error", detail);
      callbacks.onError?.(detail);
    };

    recognition.onend = () => {
      if (stopped) return;
      if (callbacks.shouldRestart?.()) {
        window.setTimeout(() => startEngine(), 120);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      logVoiceDiagnostic("Live speech recognition start failed", error);
      callbacks.onError?.(error);
    }
  };

  startEngine();

  return {
    stop: () => {
      stopped = true;
      try {
        recognition?.stop();
      } catch {
        try {
          recognition?.abort();
        } catch {
          // Ignore teardown errors.
        }
      }
      recognition = null;
    },
    getTranscript: () => finalParts.join(" ").trim(),
  };
}
