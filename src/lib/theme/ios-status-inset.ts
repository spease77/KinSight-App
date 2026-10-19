/**
 * iOS Home Screen already reserves the clock row. Never add env(safe-area-inset-top)
 * as layout padding — that stacks a second empty band under the native bar.
 */
export function syncIosStatusInset(): void {
  document.documentElement.style.setProperty("--app-sat", "0px");
  document.documentElement.classList.remove("ios-status-overlay");
}
