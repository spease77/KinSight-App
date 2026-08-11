"use client";

import { useState } from "react";
import type { ContactDetail } from "@/types/contact";
import { getProfileNotesDisplay } from "@/lib/contacts/contact-detail-cards";
import { ContactNotesLogModal } from "@/components/ContactNotesLogModal";

interface ContactProfileNotesCardProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactProfileNotesCard({
  contact,
  onContactUpdate,
}: ContactProfileNotesCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const noteText = getProfileNotesDisplay(contact);

  return (
    <>
      <section className="contact-profile-notes-card" aria-label="Notes">
        <h3 className="contact-profile-notes-card__title">Notes</h3>
        <div className="contact-profile-notes-card__body">
          {noteText ? (
            <button
              type="button"
              className="contact-profile-notes-card__content"
              onClick={() => setIsModalOpen(true)}
            >
              <p className="contact-profile-notes-card__text">{noteText}</p>
              <span className="contact-profile-notes-card__hint">
                Tap to view full activity history
              </span>
            </button>
          ) : (
            <p className="contact-profile-notes-card__empty">No notes yet.</p>
          )}
        </div>
      </section>

      {isModalOpen ? (
        <ContactNotesLogModal
          contact={contact}
          onClose={() => setIsModalOpen(false)}
          onContactUpdate={onContactUpdate}
        />
      ) : null}
    </>
  );
}
