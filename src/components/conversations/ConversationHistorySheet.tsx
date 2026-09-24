"use client";

import { MessageSquarePlus, Trash2, X } from "lucide-react";
import type { KinSightConversation } from "@/lib/conversations/types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close chat history"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-[min(100%,22rem)] flex-col border-r border-border-subtle bg-background shadow-xl"
        role="dialog"
        aria-label="Chat history"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Chats</h2>
            <p className="type-meta text-muted">Your KinSight conversations</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border-subtle p-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-orange-muted px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-orange-muted/80"
          >
            <MessageSquarePlus className="h-4 w-4" strokeWidth={2} />
            New chat
          </button>
        </div>

        <div className="contacts-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              No saved chats yet. Start talking with KinSight on Home.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <li key={conversation.id}>
                    <div
                      className={`group flex items-stretch gap-1 rounded-xl border ${
                        isActive
                          ? "border-accent-mic/40 bg-accent-mic/10"
                          : "border-transparent hover:border-border-subtle hover:bg-card-hover"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(conversation.id);
                          onClose();
                        }}
                        className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {conversation.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted">
                            {formatWhen(conversation.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {conversation.preview}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(conversation.id)}
                        className="mr-1 hidden shrink-0 self-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-red-400 group-hover:inline-flex"
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
