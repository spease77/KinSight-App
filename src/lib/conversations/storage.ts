import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/ai/message-text";
import { stripRecordingTag } from "@/lib/agent/extract-recording-id";
import type {
  ConversationSummary,
  KinSightConversation,
} from "@/lib/conversations/types";

const STORE_KEY = "kinsight-conversations-v1";
const ACTIVE_ID_KEY = "kinsight-active-conversation-id";

function readStore(): KinSightConversation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KinSightConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(conversations: KinSightConversation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(conversations));
}

export function loadActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_ID_KEY);
}

export function saveActiveConversationId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_ID_KEY, id);
}

export function listConversations(): KinSightConversation[] {
  return readStore().sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
}

export function getConversation(id: string): KinSightConversation | null {
  return readStore().find((conversation) => conversation.id === id) ?? null;
}

export function deriveConversationTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "New chat";

  const raw = stripRecordingTag(getMessageText(firstUser)).trim();
  if (!raw) return "New chat";

  const singleLine = raw.replace(/\s+/g, " ");
  return singleLine.length > 48 ? `${singleLine.slice(0, 48).trim()}…` : singleLine;
}

export function deriveConversationPreview(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((message) => {
    const text = getMessageText(message).trim();
    return text.length > 0;
  });

  if (!last) return "No messages yet";

  const raw =
    last.role === "assistant"
      ? getMessageText(last).trim()
      : stripRecordingTag(getMessageText(last)).trim();

  const singleLine = raw.replace(/\s+/g, " ");
  return singleLine.length > 72 ? `${singleLine.slice(0, 72).trim()}…` : singleLine;
}

export function createConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyConversation(): KinSightConversation {
  const now = new Date().toISOString();
  return {
    id: createConversationId(),
    title: "New chat",
    preview: "No messages yet",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function upsertConversationMessages(
  id: string,
  messages: UIMessage[]
): KinSightConversation {
  const now = new Date().toISOString();
  const existing = getConversation(id);
  const title =
    messages.length > 0
      ? deriveConversationTitle(messages)
      : existing?.title ?? "New chat";
  const preview = deriveConversationPreview(messages);

  const next: KinSightConversation = {
    id,
    title,
    preview,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages,
  };

  const all = readStore().filter((conversation) => conversation.id !== id);
  all.push(next);
  writeStore(all);
  return next;
}

export function deleteConversation(id: string): void {
  writeStore(readStore().filter((conversation) => conversation.id !== id));
}

export function listConversationSummaries(
  excludeId?: string
): ConversationSummary[] {
  return listConversations()
    .filter((conversation) => conversation.id !== excludeId)
    .map(({ id, title, preview, updatedAt }) => ({
      id,
      title,
      preview,
      updatedAt,
    }));
}
