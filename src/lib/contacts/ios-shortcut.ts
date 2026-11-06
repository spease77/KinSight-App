export const KINSIGHT_CONTACTS_SHORTCUT_NAME = "KinSight Contacts";

export function contactsShortcutRunUrl(): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(
    KINSIGHT_CONTACTS_SHORTCUT_NAME
  )}`;
}

export function contactsImportUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/contacts/import-file`;
}

export function contactsSyncedReturnUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/contacts?contactsSynced=1`;
}
