export type ToastVariant = "error" | "success";

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

type ToastListener = (toast: ToastMessage | null) => void;

let toastId = 0;
let activeToast: ToastMessage | null = null;
const listeners = new Set<ToastListener>();

function emit() {
  for (const listener of listeners) {
    listener(activeToast);
  }
}

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(activeToast);
  return () => listeners.delete(listener);
}

export function showToast(message: string, variant: ToastVariant = "error") {
  const currentId = ++toastId;
  activeToast = {
    id: currentId,
    message,
    variant,
  };
  emit();

  window.setTimeout(() => {
    if (activeToast?.id === currentId) {
      activeToast = null;
      emit();
    }
  }, 5000);
}

export function showErrorToast(message: string) {
  showToast(message, "error");
}

export function showSuccessToast(message: string) {
  showToast(message, "success");
}
