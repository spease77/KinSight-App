"use client";

import { useEffect, useId, useRef } from "react";
import { Search, X } from "lucide-react";

interface AgendaSearchBarProps {
  open: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}

export function AgendaSearchBar({
  open,
  query,
  onQueryChange,
  onClose,
}: AgendaSearchBarProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <div className="px-5 pb-3 pt-1">
          <label htmlFor={inputId} className="sr-only">
            Search agenda
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-icon"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search contacts, notes, or meetings"
              className="ui-input w-full border-border-green/40 bg-elevated/80 py-2.5 pl-10 pr-10 text-sm backdrop-blur-md"
              autoComplete="off"
              enterKeyHint="search"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
