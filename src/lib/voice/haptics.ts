export async function triggerVoiceHaptic(
  pattern: "wake" | "success" | "error" = "wake"
): Promise<void> {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  const patterns: Record<typeof pattern, number | number[]> = {
    wake: [12, 40, 18],
    success: [10, 30, 10, 30, 20],
    error: [40, 60, 40],
  };

  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Vibration may be blocked on some browsers.
  }
}
