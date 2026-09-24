const IOS_CHUNK_MS = 500;
const DESKTOP_CHUNK_MS = 250;
const IOS_STOP_FLUSH_MS = 120;

export function isAppleMobileDevice(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export function recorderTimesliceMs(): number | undefined {
  return isAppleMobileDevice() ? IOS_CHUNK_MS : DESKTOP_CHUNK_MS;
}

export function flushAndStopMediaRecorder(recorder: MediaRecorder): void {
  if (recorder.state !== "recording") return;

  try {
    recorder.requestData();
  } catch {
    // Some browsers reject requestData when not using timeslices.
  }

  const finishStop = () => {
    if (recorder.state === "recording") {
      recorder.stop();
    }
  };

  if (isAppleMobileDevice()) {
    window.setTimeout(finishStop, IOS_STOP_FLUSH_MS);
  } else {
    finishStop();
  }
}

export function mergeRecordingChunks(chunks: Blob[], mimeType: string): Blob {
  return new Blob(chunks, { type: mimeType });
}

export function appendRecordingChunk(chunks: Blob[], data: Blob | undefined): void {
  if (data && data.size > 0) {
    chunks.push(data);
  }
}
