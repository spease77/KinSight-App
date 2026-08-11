"use client";

import { useState } from "react";
import type { ContactDetail } from "@/types/contact";
import type { ContactType } from "@/lib/contacts/contact-type";
import { ContactTypeSelector } from "@/components/ContactTypeSelector";

interface ContactTypeFieldProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactTypeField({
  contact,
  onContactUpdate,
}: ContactTypeFieldProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (type: ContactType) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType: type,
          contactTypeNeedsConfirmation: false,
        }),
      });
      const data = (await res.json()) as {
        contact?: ContactDetail;
        error?: string;
      };
      if (res.ok && data.contact) {
        onContactUpdate?.(data.contact);
      } else if (!res.ok) {
        console.error("Could not save contact type:", data.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ContactTypeSelector
      value={contact.contactType}
      needsConfirmation={contact.contactTypeNeedsConfirmation}
      onChange={handleChange}
      disabled={isSaving}
      centered
    />
  );
}
