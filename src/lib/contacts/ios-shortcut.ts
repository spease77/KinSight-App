export const KINSIGHT_CONTACTS_SHORTCUT_NAME = "KinSight Contacts";

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
