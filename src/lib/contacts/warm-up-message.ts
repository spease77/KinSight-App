import {
  buildSmsHref,
  getContactPhoneOptions,
} from "@/lib/contacts/contact-phone";
import type { ContactProfile } from "@/types/contact-profile";

export function draftWarmUpMessage(contactName: string): string {
  const first = contactName.trim().split(/\s+/)[0] || "there";
  return `Hey ${first} — it's been a while. Would love to catch up when you have a minute.`;
}

export function openWarmUpDraft(input: {
  contactName: string;
  email?: string | null;
  profile?: ContactProfile | null;
}): "sms" | "email" | "copied" {
  const body = draftWarmUpMessage(input.contactName);
  const phone = getContactPhoneOptions(input.profile)[0]?.e164;
  if (phone) {
    window.location.assign(buildSmsHref(phone, body));
    return "sms";
  }

  const email = input.email?.trim();
  if (email) {
    window.location.assign(
      `mailto:${encodeURIComponent(email)}?body=${encodeURIComponent(body)}`
    );
    return "email";
  }

  void navigator.clipboard?.writeText(body);
  return "copied";
}
