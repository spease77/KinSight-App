"use client";

import { useEffect, useRef, useState } from "react";

export interface UseAudioVisualizerOptions {
  /** Active `MediaStream` from the recording pipeline (e.g. while recording). */
  stream: MediaStream | null;
  /** When false, analysis stops and `volumeLevel` resets to 0. */
  enabled?: boolean;
}

export interface UseAudioVisualizerResult {
  /** Normalized loudness from 0 (silent) to 100 (peak). */
  volumeLevel: number;
  /** Whether the analyser loop is currently running. */
  isActive: boolean;
}

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return null;

  return new AudioCtx();
}

/**
 * Derives a 0–100 volume level from an AnalyserNode using RMS amplitude.
 */
export function measureAnalyserVolume(
  analyser: AnalyserNode,
  timeDomainBuffer: Uint8Array
): number {
  analyser.getByteTimeDomainData(timeDomainBuffer);

  let sumSquares = 0;
  for (let index = 0; index < timeDomainBuffer.length; index += 1) {
    const sample = (timeDomainBuffer[index] - 128) / 128;
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / timeDomainBuffer.length);
  // Speech RMS is typically low; scale so normal talking lands ~30–70.
  const scaled = Math.min(100, Math.round(rms * 280));
  return scaled;
}

export function useAudioVisualizer({
  stream,
  enabled = true,
}: UseAudioVisualizerOptions): UseAudioVisualizerResult {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timeDomainBufferRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!stream || !enabled) {
      setVolumeLevel(0);
      setIsActive(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || audioTracks.every((track) => !track.enabled)) {
      setVolumeLevel(0);
      setIsActive(false);
      return;
    }

    const audioContext = createAudioContext();
    if (!audioContext) {
      setVolumeLevel(0);
      setIsActive(false);
      return;
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const timeDomainBuffer = new Uint8Array(analyser.fftSize);
    timeDomainBufferRef.current = timeDomainBuffer;

    let frameId = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const level = measureAnalyserVolume(analyser, timeDomainBuffer);
      setVolumeLevel(level);
      frameId = requestAnimationFrame(tick);
    };

    const start = async () => {
      try {
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
      } catch {
        if (!cancelled) {
          setVolumeLevel(0);
          setIsActive(false);
        }
        return;
      }

      if (cancelled) return;

      setIsActive(true);
      frameId = requestAnimationFrame(tick);
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      source.disconnect();
      analyser.disconnect();
      timeDomainBufferRef.current = null;
      setVolumeLevel(0);
      setIsActive(false);
      void audioContext.close();
    };
  }, [stream, enabled]);

  return { volumeLevel, isActive };
}
