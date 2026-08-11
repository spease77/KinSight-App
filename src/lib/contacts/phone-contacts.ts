export interface ContactProperty {
  name?: string[];
  email?: string[];
  tel?: string[];
  organization?: string[];
  title?: string[];
}

export interface PhoneContactImport {
  name: string;
  company?: string;
  role?: string;
  phone?: string;
  email?: string;
}

export function isPhoneContactSyncSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof navigator.contacts?.select === "function"
  );
}

function firstValue(values?: string[]): string | undefined {
  const value = values?.[0]?.trim();
  return value || undefined;
}

export function mapPickedContact(contact: ContactProperty): PhoneContactImport | null {
  const name = firstValue(contact.name);
  if (!name) return null;

  return {
    name,
    company: firstValue(contact.organization),
    role: firstValue(contact.title),
    phone: firstValue(contact.tel),
    email: firstValue(contact.email),
  };
}

export function formatContactPickerError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "SecurityError" || err.name === "NotAllowedError") {
      return "Contact access was denied. Allow contacts permission in your browser settings, then try Sync again.";
    }
    if (err.name === "AbortError") {
      return "Contact picker was cancelled.";
    }
    if (err.message) return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Could not open the phone contact picker.";
}

export async function pickPhoneContacts(): Promise<PhoneContactImport[]> {
  if (!isPhoneContactSyncSupported()) {
    throw new Error(
      "Phone contact sync is not supported in this browser. Try Chrome on Android, or add contacts with KinSight Voice on Home."
    );
  }

  try {
    const picked = await navigator.contacts!.select(
      ["name", "email", "tel", "organization", "title"],
      { multiple: true }
    );

    return picked
      .map(mapPickedContact)
      .filter((contact): contact is PhoneContactImport => contact !== null);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return [];
    }
    throw new Error(formatContactPickerError(err));
  }
}
