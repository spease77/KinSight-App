"use client";

import { useMemo, useState } from "react";
import {
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type { KinSightConversation } from "@/lib/conversations/types";

type ConversationHistorySheetProps = {
  open: boolean;
  onClose: () => void;
  conversations: KinSightConversation[];
  activeConversationId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
};

export function ConversationHistorySheet({
  open,
  onClose,
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationHistorySheetProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.title.toLowerCase().includes(query) ||
        conversation.preview.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  if (!open) return null;

  const handleClose = () => {
    setSearchOpen(false);
    setSearchQuery("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close menu"
        onClick={handleClose}
      />
      <aside
        className="kinsight-nav-drawer relative z-10 flex h-full w-[min(100%,20.5rem)] flex-col bg-background shadow-2xl"
        role="dialog"
        aria-label="KinSight menu"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            KinSight
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 pb-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              handleClose();
            }}
            className="flex w-full items-center gap-3 rounded-full bg-card-hover px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-card-hover/80"
          >
            <SquarePen className="h-5 w-5 shrink-0 text-foreground" strokeWidth={2} />
            New chat
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((current) => !current)}
            className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
            Search chats
          </button>
        </nav>

        {searchOpen ? (
          <div className="px-4 pb-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search your chats…"
              autoFocus
              className="w-full rounded-xl border border-border-subtle bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent-mic/50 focus:outline-none"
            />
          </div>
        ) : null}

        <div className="px-4 pb-2">
          <p className="text-xs font-medium text-muted">Recents</p>
        </div>

        <div className="contacts-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">
              {searchQuery.trim()
                ? "No chats match your search."
                : "No chats yet. Start a new conversation on Home."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <li key={conversation.id} className="group">
                    <div
                      className={`flex items-center gap-1 rounded-xl ${
                        isActive ? "bg-accent-mic/10" : "hover:bg-card-hover"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(conversation.id);
                          handleClose();
                        }}
                        className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm text-foreground"
                      >
                        {conversation.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(conversation.id)}
                        className="mr-1 shrink-0 rounded-full p-2 text-muted-foreground opacity-70 transition-opacity hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Delete ${conversation.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
