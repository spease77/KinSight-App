"use client";

import { useState } from "react";
import { AddContactFactSheet } from "@/components/AddContactFactSheet";
import {
  EditContactAddCard,
  EditContactAddRow,
} from "@/components/EditContactAddRow";
import { EditContactDeletableRow } from "@/components/EditContactDeletableRow";

interface EditContactFactsGroupProps {
  facts: string[];
  onChange: (facts: string[]) => void;
}

export function EditContactFactsGroup({
  facts,
  onChange,
}: EditContactFactsGroupProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const removeFact = (index: number) => {
    onChange(facts.filter((_, factIndex) => factIndex !== index));
  };

  const addFact = (fact: string) => {
    onChange([...facts, fact]);
  };

  if (facts.length === 0) {
    return (
      <>
        <EditContactAddCard>
          <EditContactAddRow
            label="add fact"
            onClick={() => setSheetOpen(true)}
          />
        </EditContactAddCard>

        <AddContactFactSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSave={addFact}
        />
      </>
    );
  }

  return (
    <>
      <section className="edit-contact-group">
        <div className="edit-contact-group__card">
          {facts.map((fact, index) => (
            <EditContactDeletableRow
              key={`${index}-${fact}`}
              rowId={`fact-${index}`}
              onDelete={() => removeFact(index)}
              bordered={index < facts.length - 1}
              removeAriaLabel="Remove fact"
              multiline
            >
              <p className="edit-contact-fact-row__text">{fact}</p>
            </EditContactDeletableRow>
          ))}

          <EditContactAddRow
            label="add fact"
            onClick={() => setSheetOpen(true)}
            bordered={facts.length > 0}
          />
        </div>
      </section>

      <AddContactFactSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={addFact}
      />
    </>
  );
}
