"use client";

import type { QuickAddPrompt } from "@/lib/contacts/contact-quick-add";

interface ContactQuickAddChipsProps {
  prompts: QuickAddPrompt[];
  onSelect: (promptId: QuickAddPrompt["id"]) => void;
  onBrowseAll: () => void;
}

export function ContactQuickAddChips({
  prompts,
  onSelect,
  onBrowseAll,
}: ContactQuickAddChipsProps) {
  return (
    <div className="contact-quick-add-chips" role="list" aria-label="Quick add">
      <div className="contact-quick-add-chips__track">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            role="listitem"
            className="contact-quick-add-chip whitespace-nowrap rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/16 active:scale-[0.97]"
            onClick={() => onSelect(prompt.id)}
          >
            + Add {prompt.chipLabel ?? prompt.label}
          </button>
        ))}
        <button
          type="button"
          role="listitem"
          className="contact-quick-add-chip contact-quick-add-chip--browse whitespace-nowrap rounded-full bg-slate-800/80 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-700/90 active:scale-[0.97]"
          onClick={onBrowseAll}
        >
          + All Options
        </button>
      </div>
    </div>
  );
}
