"use client";

import type { RelationshipType } from "@/lib/contacts/relationship-tree";
import { inferContactTypeFromRelationshipType } from "@/lib/contacts/relationship-tree";
import { contactTypePillClass } from "@/lib/contacts/contact-type";

interface ContactRelationshipLabelProps {
  label: string;
  relationshipType?: RelationshipType | "";
  className?: string;
  compact?: boolean;
  variant?: "default" | "hero" | "inline";
}

export function ContactRelationshipLabel({
  label,
  relationshipType,
  className = "",
  compact = false,
  variant = "default",
}: ContactRelationshipLabelProps) {
  if (!label.trim()) return null;

  if (variant === "inline") {
    return (
      <span className={`contact-detail-hero__relationship-pill ${className}`}>
        {label}
      </span>
    );
  }

  if (variant === "hero") {
    const accentClass = relationshipType
      ? `contact-detail-relationship-badge--${inferContactTypeFromRelationshipType(
          relationshipType
        )}`
      : "contact-detail-relationship-badge--personal";

    return (
      <span
        className={`contact-detail-relationship-badge ${accentClass} ${className}`}
      >
        {label}
      </span>
    );
  }

  const pillClass = relationshipType
    ? contactTypePillClass(
        inferContactTypeFromRelationshipType(relationshipType),
        true
      )
    : "contact-type-pill contact-type-pill--personal contact-type-pill--active";

  return (
    <span
      className={`${pillClass} ${compact ? "!px-2 !py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} ${className}`}
    >
      {label}
    </span>
  );
}
