"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import type { Contact } from "@/types/contact";
import { filterContacts } from "@/lib/contacts/filter-contacts";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useContacts } from "@/hooks/useContacts";

interface MeetingContactSearchFieldProps {
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  onClearContact: () => void;
  disabled?: boolean;
  variant?: "default" | "grouped";
}

const CONTACT_RESULT_LIMIT = 8;

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

function ContactSearchList({
  listboxId,
  filteredContacts,
  onSelectContact,
  className,
  style,
}: {
  listboxId: string;
  filteredContacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <ul
      id={listboxId}
      role="listbox"
      data-contact-dropdown={listboxId}
      className={className}
      style={style}
    >
      {filteredContacts.length === 0 ? (
        <li className="px-3 py-2 text-sm text-muted">No contacts found.</li>
      ) : (
        filteredContacts.map((contact) => (
          <li key={contact.id} role="option">
            <button
              type="button"
              onClick={() => onSelectContact(contact)}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-card-hover"
            >
              <ContactAvatar
                name={contact.name}
                avatarUrl={contact.avatarUrl}
                size="sm"
                className="!h-9 !w-9 !text-sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  {formatContactDisplayName(contact.name, "first")}
                </p>
                {contact.company ? (
                  <p className="truncate text-xs text-muted">{contact.company}</p>
                ) : null}
              </div>
            </button>
          </li>
        ))
      )}
    </ul>
  );
}

export function MeetingContactSearchField({
  selectedContact,
  onSelectContact,
  onClearContact,
  disabled = false,
  variant = "default",
}: MeetingContactSearchFieldProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { contacts, isLoading } = useContacts();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);

  const filteredContacts = useMemo(
    () => filterContacts(contacts, query).slice(0, CONTACT_RESULT_LIMIT),
    [contacts, query]
  );

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPosition(null);
  };

  const openDropdown = () => {
    setIsOpen(true);
    requestAnimationFrame(updateDropdownPosition);
  };

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    setQuery("");
    closeDropdown();
  };

  useEffect(() => {
    if (!isOpen || selectedContact) {
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, selectedContact, updateDropdownPosition]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest(`[data-contact-dropdown="${listboxId}"]`)) {
          closeDropdown();
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [listboxId]);

  if (variant === "grouped") {
    return (
      <div ref={containerRef} className="relative px-4 py-3.5">
        {selectedContact ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClearContact}
              disabled={disabled}
              className="min-w-0 truncate text-left text-[17px] font-medium text-accent-primary-bright transition-colors hover:text-foreground disabled:opacity-40"
            >
              {selectedContact.name}
            </button>
            <button
              type="button"
              onClick={onClearContact}
              disabled={disabled}
              className="shrink-0 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              Change
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            id={`${listboxId}-input`}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              openDropdown();
            }}
            onFocus={openDropdown}
            disabled={disabled || isLoading}
            placeholder={isLoading ? "Loading…" : "Select contact..."}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-label="Select contact"
            className="meeting-borderless-input w-full bg-transparent text-[17px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
          />
        )}

        {isOpen && !selectedContact && dropdownPosition && typeof document !== "undefined"
          ? createPortal(
              <ContactSearchList
                listboxId={listboxId}
                filteredContacts={filteredContacts}
                onSelectContact={handleSelectContact}
                className="meeting-contact-dropdown contacts-scroll fixed z-[80] overflow-y-auto rounded-xl border border-border-green bg-card p-1.5 shadow-xl"
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                }}
              />,
              document.body
            )
          : null}
      </div>
    );
  }

  if (selectedContact) {
    return (
      <div className="ui-card flex items-center justify-between gap-3 border-border-green/50 bg-card-hover/40 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <ContactAvatar
            name={selectedContact.name}
            avatarUrl={selectedContact.avatarUrl}
            size="sm"
            className="!h-10 !w-10 !text-base"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedContact.name}
            </p>
            {selectedContact.company ? (
              <p className="truncate text-xs text-muted">
                {selectedContact.company}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClearContact}
          disabled={disabled}
          className="shrink-0 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="ui-label" htmlFor={`${listboxId}-input`}>
        Select contact
      </label>
      <div className="relative mt-1.5">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon"
          strokeWidth={2}
        />
        <input
          id={`${listboxId}-input`}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            openDropdown();
          }}
          onFocus={openDropdown}
          disabled={disabled || isLoading}
          placeholder={isLoading ? "Loading contacts…" : "Search contacts…"}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          className="ui-input w-full py-2.5 pl-9 pr-3"
        />
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="meeting-contact-dropdown contacts-scroll absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 overflow-y-auto rounded-xl border border-border-green bg-card p-1.5 shadow-lg"
        >
          {filteredContacts.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No contacts found.</li>
          ) : (
            filteredContacts.map((contact) => (
              <li key={contact.id} role="option">
                <button
                  type="button"
                  onClick={() => handleSelectContact(contact)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-card-hover"
                >
                  <ContactAvatar
                    name={contact.name}
                    avatarUrl={contact.avatarUrl}
                    size="sm"
                    className="!h-9 !w-9 !text-sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {formatContactDisplayName(contact.name, "first")}
                    </p>
                    {contact.company ? (
                      <p className="truncate text-xs text-muted">
                        {contact.company}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
