"use client";

import { useEffect, useRef } from "react";

const DEFAULT_BANDS = 32;

type ListeningWaveformProps = {
  volumeLevel: number;
  waveformBands?: number[];
  className?: string;
  /** `bars` = Gemini-style pills; `line` = flowing wave lines */
  variant?: "bars" | "line";
  active?: boolean;
};

function smoothBands(source: number[], targetLength: number): number[] {
  if (source.length === 0) {
    return Array.from({ length: targetLength }, () => 0);
  }

  const output: number[] = [];
  for (let index = 0; index < targetLength; index += 1) {
    const position = (index / targetLength) * source.length;
    const left = Math.floor(position);
    const right = Math.min(source.length - 1, left + 1);
    const mix = position - left;
    const value = source[left] * (1 - mix) + source[right] * mix;
    output.push(Math.min(1, Math.max(0, value)));
  }
  return output;
}

export function ListeningWaveform({
  volumeLevel,
  waveformBands,
  className = "",
  variant = "bars",
  active = true,
}: ListeningWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const bandsRef = useRef<number[]>(Array(DEFAULT_BANDS).fill(0.15));

  useEffect(() => {
    if (waveformBands && waveformBands.length > 0) {
      bandsRef.current = smoothBands(waveformBands, DEFAULT_BANDS);
    }
  }, [waveformBands]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let cancelled = false;

    const drawBars = (timestamp: number, width: number, height: number) => {
      const intensity = Math.min(1, volumeLevel / 100);
      phaseRef.current = timestamp * 0.003;
      const bands = bandsRef.current;
      const barCount = bands.length;
      const gap = 5;
      const barWidth = Math.max(3, (width - gap * (barCount - 1)) / barCount);
      const maxBarHeight = height * 0.72;

      for (let index = 0; index < barCount; index += 1) {
        const energy = active
          ? Math.max(0.12, bands[index] ?? 0.12)
          : 0.12 + Math.sin(phaseRef.current + index * 0.35) * 0.06;
        const breathe = active
          ? Math.sin(phaseRef.current + index * 0.45) * 0.08
          : 0;
        const level = Math.min(1, energy + breathe + intensity * 0.25);
        const barHeight = Math.max(8, level * maxBarHeight);
        const x = index * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const gradient = context.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "rgba(147, 197, 253, 0.95)");
        gradient.addColorStop(0.5, "rgba(129, 140, 248, 0.9)");
        gradient.addColorStop(1, "rgba(74, 222, 159, 0.85)");

        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
    };

    const drawLine = (timestamp: number, width: number, height: number) => {
      const centerY = height / 2;
      const intensity = Math.min(1, volumeLevel / 100);
      phaseRef.current = timestamp * 0.0025;
      const bands = bandsRef.current;
      const layers = [
        { color: "rgba(96, 165, 250, 0.55)", width: 2.5, phase: 0 },
        { color: "rgba(167, 139, 250, 0.75)", width: 2, phase: 1.2 },
        { color: "rgba(74, 222, 159, 0.9)", width: 1.75, phase: 2.4 },
      ];

      for (const layer of layers) {
        context.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const t = x / Math.max(width, 1);
          const bandIndex = Math.min(bands.length - 1, Math.floor(t * bands.length));
          const bandEnergy = bands[bandIndex] ?? 0;
          const wave =
            Math.sin(t * Math.PI * 4 + phaseRef.current + layer.phase) *
            (8 + bandEnergy * 28 + intensity * 14);
          const y = centerY + wave;
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = layer.color;
        context.lineWidth = layer.width;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();
      }
    };

    const draw = (timestamp: number) => {
      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (
        canvas.width !== Math.floor(width * dpr) ||
        canvas.height !== Math.floor(height * dpr)
      ) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      context.clearRect(0, 0, width, height);

      if (variant === "bars") {
        drawBars(timestamp, width, height);
      } else {
        drawLine(timestamp, width, height);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [volumeLevel, variant, active]);

  return (
    <canvas
      ref={canvasRef}
      className={`listening-waveform block w-full ${className}`}
      style={{ height: variant === "bars" ? "6.5rem" : "5.5rem" }}
      aria-hidden="true"
    />
  );
}
