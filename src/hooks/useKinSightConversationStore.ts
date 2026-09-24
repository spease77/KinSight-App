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

function resolveInitialConversationState(): {
  hydrated: boolean;
  conversations: KinSightConversation[];
  activeConversationId: string;
} {
  if (typeof window === "undefined") {
    return { hydrated: false, conversations: [], activeConversationId: "" };
  }

  const stored = listConversations();
  const savedActiveId = loadActiveConversationId();
  const active =
    (savedActiveId && stored.find((item) => item.id === savedActiveId)) ||
    stored[0] ||
    createEmptyConversation();

  if (!stored.some((item) => item.id === active.id)) {
    upsertConversationMessages(active.id, active.messages);
  }

  saveActiveConversationId(active.id);

  return {
    hydrated: true,
    conversations: listConversations(),
    activeConversationId: active.id,
  };
}

let initialConversationStoreSnapshot: ReturnType<
  typeof resolveInitialConversationState
> | null = null;

function getInitialConversationStoreSnapshot() {
  if (typeof window === "undefined") {
    return {
      hydrated: false,
      conversations: [] as KinSightConversation[],
      activeConversationId: "",
    };
  }
  if (!initialConversationStoreSnapshot) {
    initialConversationStoreSnapshot = resolveInitialConversationState();
  }
  return initialConversationStoreSnapshot;
}

export function useKinSightConversationStore() {
  const [hydrated] = useState(
    () => getInitialConversationStoreSnapshot().hydrated
  );
  const [conversations, setConversations] = useState<KinSightConversation[]>(
    () => getInitialConversationStoreSnapshot().conversations
  );
  const [activeConversationId, setActiveConversationId] = useState(
    () => getInitialConversationStoreSnapshot().activeConversationId
  );

  const pendingPersistRef = useRef<{
    id: string;
    messages: UIMessage[];
  } | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const flushScheduledPersist = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const pending = pendingPersistRef.current;
    if (!pending) return;

    pendingPersistRef.current = null;
    upsertConversationMessages(pending.id, pending.messages);
    setConversations(listConversations());
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const refreshList = useCallback(() => {
    setConversations(listConversations());
  }, []);

  const selectConversation = useCallback((id: string) => {
    if (!getConversation(id)) return null;
    setActiveConversationId(id);
    saveActiveConversationId(id);
    return getConversation(id);
  }, []);

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

  const schedulePersistMessages = useCallback(
    (id: string, messages: UIMessage[]) => {
      pendingPersistRef.current = { id, messages };

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        flushScheduledPersist();
      }, 200);
    },
    [flushScheduledPersist]
  );

  useEffect(() => {
    const flushOnHide = () => {
      flushScheduledPersist();
    };

    window.addEventListener("pagehide", flushOnHide);
    window.addEventListener("beforeunload", flushOnHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushOnHide();
      }
    });

    return () => {
      window.removeEventListener("pagehide", flushOnHide);
      window.removeEventListener("beforeunload", flushOnHide);
      flushOnHide();
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [flushScheduledPersist]);

  return {
    hydrated,
    conversations,
    activeConversationId,
    activeConversation,
    selectConversation,
    startNewConversation,
    persistMessages,
    schedulePersistMessages,
    flushScheduledPersist,
    removeConversation,
    refreshList,
  };
}
