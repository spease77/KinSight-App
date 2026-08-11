"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type EditContactDeleteContextValue = {
  deletingRowId: string | null;
  setDeletingRowId: (rowId: string | null) => void;
  toggleDeletingRow: (rowId: string) => void;
};

const EditContactDeleteContext =
  createContext<EditContactDeleteContextValue | null>(null);

export function EditContactDeleteProvider({ children }: { children: ReactNode }) {
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

  const toggleDeletingRow = useCallback((rowId: string) => {
    setDeletingRowId((current) => (current === rowId ? null : rowId));
  }, []);

  useEffect(() => {
    if (!deletingRowId) return;

    const dismiss = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".edit-contact-deletable-row")) return;
      setDeletingRowId(null);
    };

    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", dismiss);
      document.addEventListener("touchstart", dismiss);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("touchstart", dismiss);
    };
  }, [deletingRowId]);

  const value = useMemo(
    () => ({
      deletingRowId,
      setDeletingRowId,
      toggleDeletingRow,
    }),
    [deletingRowId, toggleDeletingRow]
  );

  return (
    <EditContactDeleteContext.Provider value={value}>
      {children}
    </EditContactDeleteContext.Provider>
  );
}

export function useEditContactDelete() {
  const context = useContext(EditContactDeleteContext);
  if (!context) {
    throw new Error(
      "useEditContactDelete must be used within EditContactDeleteProvider"
    );
  }
  return context;
}
