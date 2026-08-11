"use client";

interface EditContactSectionProps {
  title: string;
  children: React.ReactNode;
}

export function EditContactSection({
  title,
  children,
}: EditContactSectionProps) {
  return (
    <div className="edit-contact-section">
      <h2 className="edit-contact-section__title">{title}</h2>
      {children}
    </div>
  );
}
