"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import type { KinSightConversation } from "@/lib/conversations/types";
import {
  createEmptyConversation,
  deleteConversation as deleteStoredConversation,
  getConversation,
  listConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  upsertConversationMessages,
} from "@/lib/conversations/storage";

export function useKinSightConversationStore() {
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<KinSightConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");

  useEffect(() => {
    const stored = listConversations();
    const savedActiveId = loadActiveConversationId();
    const active =
      (savedActiveId && stored.find((item) => item.id === savedActiveId)) ||
      stored[0] ||
      createEmptyConversation();

    if (!stored.some((item) => item.id === active.id)) {
      upsertConversationMessages(active.id, active.messages);
    }

    setConversations(listConversations());
    setActiveConversationId(active.id);
    saveActiveConversationId(active.id);
    setHydrated(true);
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const refreshList = useCallback(() => {
    setConversations(listConversations());
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      if (!getConversation(id)) return null;
      setActiveConversationId(id);
      saveActiveConversationId(id);
      return getConversation(id);
    },
    []
  );

  const startNewConversation = useCallback(() => {
    const created = createEmptyConversation();
    upsertConversationMessages(created.id, created.messages);
    refreshList();
    setActiveConversationId(created.id);
    saveActiveConversationId(created.id);
    return created;
  }, [refreshList]);

  const persistMessages = useCallback(
    (id: string, messages: UIMessage[]) => {
      upsertConversationMessages(id, messages);
      refreshList();
    },
    [refreshList]
  );

  const removeConversation = useCallback(
    (id: string) => {
      deleteStoredConversation(id);
      const remaining = listConversations();
      refreshList();

      if (activeConversationId !== id) {
        return getConversation(activeConversationId);
      }

      const next = remaining[0] ?? createEmptyConversation();
      if (!remaining.some((item) => item.id === next.id)) {
        upsertConversationMessages(next.id, next.messages);
        refreshList();
      }
      setActiveConversationId(next.id);
      saveActiveConversationId(next.id);
      return getConversation(next.id);
    },
    [activeConversationId, refreshList]
  );

  const saveTimerRef = useRef<number | null>(null);

  const schedulePersistMessages = useCallback(
    (id: string, messages: UIMessage[]) => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        persistMessages(id, messages);
      }, 400);
    },
    [persistMessages]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    hydrated,
    conversations,
    activeConversationId,
    activeConversation,
    selectConversation,
    startNewConversation,
    persistMessages,
    schedulePersistMessages,
    removeConversation,
    refreshList,
  };
}
