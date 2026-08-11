"use client";

import { useEffect, useState } from "react";
import { subscribeToToasts, type ToastMessage } from "@/lib/ui/toast";

export function ToastViewport() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => subscribeToToasts(setToast), []);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${
          toast.variant === "error"
            ? "border-red-400/50 bg-card text-red-200"
            : "border-border-green bg-tint-green text-foreground"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
