/** True when running as an iOS Home Screen / installed PWA (not an in-browser tab). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true ||
    document.documentElement.dataset.standalone === "true"
  );
}
