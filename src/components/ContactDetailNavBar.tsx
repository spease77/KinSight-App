"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ContactDetailNavBarProps {
  contactId: string;
}

export function ContactDetailNavBar({ contactId }: ContactDetailNavBarProps) {
  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-16">
      <nav
        className="contact-detail-nav mx-auto flex h-full w-full max-w-lg items-center justify-between bg-transparent px-5"
        aria-label="Contact navigation"
      >
        <Link
          href="/contacts"
          className="contact-detail-nav__pill contact-detail-nav__pill--icon pointer-events-auto border border-white/10 bg-zinc-900/60 shadow-lg backdrop-blur-md"
          aria-label="Back to contacts"
        >
          <ChevronLeft className="contact-detail-nav__chevron" strokeWidth={2.5} />
        </Link>
        <Link
          href={`/contacts/${contactId}/edit`}
          className="contact-detail-nav__pill contact-detail-nav__pill--edit pointer-events-auto border border-white/10 bg-zinc-900/60 text-sky-400 shadow-lg backdrop-blur-md"
        >
          Edit
        </Link>
      </nav>
    </div>
  );
}