"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import type { Contact } from "@/types/contact";
import { Header } from "@/components/Header";
import { InvestmentContactList } from "@/components/investment/InvestmentContactList";
import { TimeInvestmentMilestoneCard } from "@/components/investment/TimeInvestmentMilestoneCard";
import { LogTimeModal } from "@/components/investment/LogTimeModal";
import { useContacts } from "@/hooks/useContacts";

export function InvestmentPage() {
  const { contacts, isLoading } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isLogTimeOpen, setIsLogTimeOpen] = useState(false);
  const milestoneRef = useRef<HTMLElement>(null);
  const skipSelectionScrollRef = useRef(true);

  const handleLogged = () => {
    setRefreshToken((current) => current + 1);
  };

  useEffect(() => {
    if (isLoading) return;

    setSelectedContact((current) => {
      if (!current) return null;
      return contacts.some((contact) => contact.id === current.id)
        ? current
        : null;
    });
  }, [contacts, isLoading]);

  const handleContactSelect = useCallback((contact: Contact) => {
    setSelectedContact(contact);
  }, []);

  useEffect(() => {
    if (skipSelectionScrollRef.current) {
      skipSelectionScrollRef.current = false;
      return;
    }

    milestoneRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedContact?.id]);

  const headerActions = (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => setIsLogTimeOpen((open) => !open)}
        className="
          ui-btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
          active:scale-[0.98]
        "
        aria-expanded={isLogTimeOpen}
        aria-label="Add time log entry"
      >
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        Add
      </button>
    </div>
  );

  return (
    <>
      <Header title="Time Log" headerActions={headerActions} />
      <main className="flex flex-col gap-3 px-5 pb-6 pt-4">
        <div className="flex flex-col">
          <TimeInvestmentMilestoneCard
            ref={milestoneRef}
            selectedContact={selectedContact}
            refreshToken={refreshToken}
          />
          <p className="mt-2 mb-3 text-center text-sm text-zinc-400">
            Track interactions to maintain a strong bond.
          </p>
        </div>

        {isLoading ? (
          <p className="type-meta text-center">Loading contacts…</p>
        ) : (
          <InvestmentContactList
            contacts={contacts}
            selectedContactId={selectedContact?.id ?? null}
            onContactSelect={handleContactSelect}
            refreshToken={refreshToken}
          />
        )}
      </main>

      <LogTimeModal
        open={isLogTimeOpen}
        onClose={() => setIsLogTimeOpen(false)}
        selectedContact={selectedContact}
        onSelectedContactChange={setSelectedContact}
        onLogged={handleLogged}
      />
    </>
  );
}
