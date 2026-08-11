"use client";

import { Plus } from "lucide-react";

interface EditContactAddRowProps {
  label: string;
  onClick: () => void;
  bordered?: boolean;
  className?: string;
}

export function EditContactAddRow({
  label,
  onClick,
  bordered = false,
  className = "",
}: EditContactAddRowProps) {
  return (
    <button
      type="button"
      className={`edit-contact-add-row ${
        bordered ? "edit-contact-add-row--bordered" : ""
      } ${className}`.trim()}
      onClick={onClick}
    >
      <span className="edit-contact-row__icon-slot" aria-hidden>
        <span className="edit-contact-add-row__icon">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
        </span>
      </span>
      <span className="edit-contact-add-row__label">{label}</span>
    </button>
  );
}

export function EditContactAddCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="edit-contact-group">
      <div className="edit-contact-group__card">{children}</div>
    </section>
  );
}
