"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditContactView } from "@/components/EditContactView";
import { useContactLoader } from "@/hooks/useContactLoader";

interface EditContactPageProps {
  id: string;
}

export function EditContactPage({ id }: EditContactPageProps) {
  const { contact, setContact, error, isLoading, refreshContact } =
    useContactLoader(id);

  if (isLoading) {
    return (
      <p className="type-meta px-5 py-8 text-center" aria-live="polite">
        Loading contact…
      </p>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
        <p className="text-sm text-red-400/90">
          {error ?? "Contact not found"}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contacts"
            className="ui-btn-outline-green inline-flex items-center gap-1.5 px-4 py-2.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            All contacts
          </Link>
          <button
            type="button"
            onClick={() => void refreshContact()}
            className="ui-btn-primary px-4 py-2.5 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <EditContactView contact={contact} onContactUpdate={setContact} />;
}
