export const KINSIGHT_CONTACTS_SHORTCUT_NAME = "KinSight Contacts";
export const KINSIGHT_CONTACTS_SHORTCUT_READY_KEY =
  "kinsight-ios-contacts-shortcut-ready";

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isContactsShortcutReady(): boolean {
  try {
    return window.localStorage.getItem(KINSIGHT_CONTACTS_SHORTCUT_READY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setContactsShortcutReady(ready: boolean): void {
  try {
    if (ready) {
      window.localStorage.setItem(KINSIGHT_CONTACTS_SHORTCUT_READY_KEY, "1");
    } else {
      window.localStorage.removeItem(KINSIGHT_CONTACTS_SHORTCUT_READY_KEY);
    }
  } catch {
    // ignore
  }
}

export function contactsShortcutCreateUrl(): string {
  return "shortcuts://create-shortcut";
}

export function contactsShortcutRunUrl(origin: string): string {
  const errorUrl = `${origin.replace(/\/$/, "")}/contacts?shortcutMissing=1`;
  return (
    `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(
      KINSIGHT_CONTACTS_SHORTCUT_NAME
    )}&x-error=${encodeURIComponent(errorUrl)}`
  );
}

export function contactsImportUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/contacts/import-file`;
}

export function contactsSyncedReturnUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/contacts?contactsSynced=1`;
}
