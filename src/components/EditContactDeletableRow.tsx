"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { useEditContactDelete } from "@/components/EditContactDeleteContext";

const ROW_REMOVE_ANIMATION_MS = 200;

interface EditContactDeletableRowProps {
  rowId: string;
  onDelete: () => void;
  bordered?: boolean;
  removeAriaLabel?: string;
  multiline?: boolean;
  children: React.ReactNode;
}

export function EditContactDeletableRow({
  rowId,
  onDelete,
  bordered = false,
  removeAriaLabel = "Remove row",
  multiline = false,
  children,
}: EditContactDeletableRowProps) {
  const { deletingRowId, toggleDeletingRow, setDeletingRowId } =
    useEditContactDelete();
  const [isRemoving, setIsRemoving] = useState(false);
  const isDeleteActive = deletingRowId === rowId;

  const handleDeleteConfirm = () => {
    setDeletingRowId(null);
    setIsRemoving(true);
    window.setTimeout(() => {
      onDelete();
    }, ROW_REMOVE_ANIMATION_MS);
  };

  return (
    <div
      className={`edit-contact-deletable-row ${
        multiline ? "edit-contact-deletable-row--multiline" : ""
      } ${
        isRemoving ? "edit-contact-deletable-row--removing" : ""
      } ${bordered ? "edit-contact-deletable-row--border" : ""}`.trim()}
      data-edit-contact-deletable-row
    >
      <div
        className={`edit-contact-row ${
          multiline ? "edit-contact-row--multiline" : ""
        } ${isDeleteActive ? "edit-contact-row--delete-active" : ""}`}
      >
        <div className="edit-contact-row__icon-slot">
          <button
            type="button"
            className={`edit-contact-row__minus ${
              isDeleteActive ? "edit-contact-row__minus--active" : ""
            }`}
            onClick={(event) => {
              event.stopPropagation();
              toggleDeletingRow(rowId);
            }}
            aria-label={removeAriaLabel}
            aria-pressed={isDeleteActive}
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="edit-contact-row__body">{children}</div>

        <button
          type="button"
          className={`edit-contact-row__delete-btn ${
            isDeleteActive ? "edit-contact-row__delete-btn--visible" : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            handleDeleteConfirm();
          }}
          tabIndex={isDeleteActive ? 0 : -1}
          aria-hidden={!isDeleteActive}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
