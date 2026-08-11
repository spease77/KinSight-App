"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import {
  getQuickAddPrompt,
  isQuickAddPromptVisible,
  QUICK_ADD_BROWSE_GROUPS,
  type QuickAddPromptId,
} from "@/lib/contacts/contact-quick-add";

interface ContactQuickAddBrowseDrawerProps {
  open: boolean;
  contact: ContactDetail;
  onClose: () => void;
  onSelect: (promptId: QuickAddPromptId) => void;
}

export function ContactQuickAddBrowseDrawer({
  open,
  contact,
  onClose,
  onSelect,
}: ContactQuickAddBrowseDrawerProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`contact-quick-add-drawer__overlay ${
        entered ? "contact-quick-add-drawer__overlay--open" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-quick-add-browse-title"
      onClick={onClose}
    >
      <div
        className={`contact-quick-add-drawer__sheet contact-quick-add-browse__sheet ${
          entered ? "contact-quick-add-drawer__sheet--open" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contact-quick-add-drawer__header">
          <button
            type="button"
            onClick={onClose}
            className="contact-quick-add-drawer__header-btn"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2
              id="contact-quick-add-browse-title"
              className="font-sans text-[17px] font-semibold tracking-tight text-foreground"
            >
              Browse All Options
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Pick a category to quick-add intel
            </p>
          </div>
          <div className="contact-quick-add-drawer__header-btn" aria-hidden />
        </header>

        <div className="contact-quick-add-browse__body contacts-scroll">
          {QUICK_ADD_BROWSE_GROUPS.map((group) => {
            const visiblePrompts = group.promptIds
              .map((id) => getQuickAddPrompt(id))
              .filter((prompt): prompt is NonNullable<typeof prompt> =>
                Boolean(prompt)
              );

            if (visiblePrompts.length === 0) return null;

            return (
              <section key={group.title} className="contact-quick-add-browse__group">
                <h3 className="contact-quick-add-browse__group-title">
                  {group.title}
                </h3>
                <div className="contact-quick-add-browse__list">
                  {visiblePrompts.map((prompt) => {
                    const isVisible = isQuickAddPromptVisible(
                      contact,
                      prompt.id
                    );
                    return (
                      <button
                        key={prompt.id}
                        type="button"
                        className="contact-quick-add-browse__option"
                        onClick={() => {
                          onSelect(prompt.id);
                          onClose();
                        }}
                      >
                        <span className="contact-quick-add-browse__option-label">
                          + {prompt.label}
                        </span>
                        {!isVisible && (
                          <span className="contact-quick-add-browse__option-meta">
                            Add another
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
