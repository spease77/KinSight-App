/** Contact Picker API — https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API */

interface ContactProperty {
  name?: string[];
  email?: string[];
  tel?: string[];
  organization?: string[];
  title?: string[];
}

interface ContactsManager {
  select(
    properties: Array<"name" | "email" | "tel" | "organization" | "title">,
    options?: { multiple?: boolean }
  ): Promise<ContactProperty[]>;
}

interface Navigator {
  contacts?: ContactsManager;
}
