"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import type { Contact } from "@/types/contact";
import { Header } from "@/components/Header";
import { InvestmentContactList } from "@/components/investment/InvestmentContactList";
import { TimeInvestmentMilestoneCard } from "@/components/investment/TimeInvestmentMilestoneCard";
import { LogTimeContactPicker } from "@/components/investment/LogTimeContactPicker";
import { useContacts } from "@/hooks/useContacts";

export function InvestmentPage() {
  const { contacts, isLoading } = useContacts();
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showLogTimeForm, setShowLogTimeForm] = useState(false);
  const milestoneRef = useRef<HTMLElement>(null);
  const skipSelectionScrollRef = useRef(true);

  const handleLogged = () => {
    setRefreshToken((current) => current + 1);
  };

  const handleContactSelect = useCallback((contact: Contact) => {
    setSelectedContacts((current) => {
      const isSelected = current.some((item) => item.id === contact.id);
      if (isSelected) {
        return current.filter((item) => item.id !== contact.id);
      }
      return [...current, contact];
    });
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
  }, [selectedContacts]);

  const selectedContactIds = selectedContacts.map((contact) => contact.id);

  const headerActions = (
    <button
      type="button"
      onClick={() => setShowLogTimeForm(true)}
      className="
        ui-btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
        active:scale-[0.98]
      "
      aria-expanded={showLogTimeForm}
    >
      <Clock className="h-3.5 w-3.5" strokeWidth={2} />
      Log Time
    </button>
  );

  return (
    <>
      <Header title="Time Log" headerActions={headerActions} />
      <main className="flex flex-col gap-6 px-5 pb-6 pt-4">
        <div className="flex flex-col gap-3">
          <TimeInvestmentMilestoneCard
            ref={milestoneRef}
            contacts={selectedContacts}
            refreshToken={refreshToken}
          />
          <p className="mx-auto mb-4 max-w-md text-center text-sm text-zinc-400">
            Log a touchpoint every 45 days to maintain a strong connection.
          </p>
        </div>

        <LogTimeContactPicker
          selectedContacts={selectedContacts}
          onContactsChange={setSelectedContacts}
          onContactSelect={handleContactSelect}
          onLogged={handleLogged}
          showEntryForm={showLogTimeForm}
          onShowEntryFormChange={setShowLogTimeForm}
        />

        {isLoading ? (
          <p className="type-meta text-center">Loading contacts…</p>
        ) : (
          <InvestmentContactList
            contacts={contacts}
            selectedContactIds={selectedContactIds}
            onContactSelect={handleContactSelect}
            refreshToken={refreshToken}
          />
        )}
      </main>
    </>
  );
}
