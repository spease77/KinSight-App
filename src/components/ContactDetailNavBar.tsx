"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ContactDetailNavBarProps {
  contactId: string;
}

export function ContactDetailNavBar({ contactId }: ContactDetailNavBarProps) {
  return (
    <div className="contact-detail-nav-shell pointer-events-none">
      <nav
        className="contact-detail-nav mx-auto flex h-full w-full max-w-lg items-center justify-between bg-transparent px-5"
        aria-label="Contact navigation"
      >
        <Link
          href="/contacts"
          className="contact-detail-nav__pill contact-detail-nav__pill--icon pointer-events-auto"
          aria-label="Back to contacts"
        >
          <ChevronLeft className="contact-detail-nav__chevron" strokeWidth={2.5} />
        </Link>
        <Link
          href={`/contacts/${contactId}/edit`}
          className="contact-detail-nav__pill contact-detail-nav__pill--edit pointer-events-auto"
        >
          Edit
        </Link>
      </nav>
    </div>
  );
}