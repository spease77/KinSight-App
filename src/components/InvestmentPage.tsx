"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  return (
    <>
      <Header title="Time Log" />
      <main className="flex flex-col gap-6 px-5 pb-6 pt-4">
        <div className="flex flex-col gap-3">
          <TimeInvestmentMilestoneCard
            ref={milestoneRef}
            contacts={selectedContacts}
            refreshToken={refreshToken}
          />
          <p className="text-sm leading-relaxed text-muted">
            Milestones track your long-term relationship depth. Log a touchpoint
            every 45 days to keep the relationship healthy and prevent the
            connection from fading.
          </p>
        </div>

        <LogTimeContactPicker
          selectedContacts={selectedContacts}
          onContactsChange={setSelectedContacts}
          onContactSelect={handleContactSelect}
          onLogged={handleLogged}
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
