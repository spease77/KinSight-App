"use client";

import { useMemo, useState, type RefObject } from "react";
import { Check, Copy, Smartphone, X } from "lucide-react";
import {
  KINSIGHT_CONTACTS_SHORTCUT_NAME,
  contactsImportUrl,
  contactsSyncedReturnUrl,
} from "@/lib/contacts/ios-shortcut";

interface PhoneContactSyncSheetProps {
  open: boolean;
  accept: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFiles: (files: FileList | null) => void;
  onCreateShortcut: () => void;
  onRunShortcut: () => void;
}

export function PhoneContactSyncSheet({
  open,
  accept,
  fileInputRef,
  onClose,
  onFiles,
  onCreateShortcut,
  onRunShortcut,
}: PhoneContactSyncSheetProps) {
  const [copied, setCopied] = useState<"import" | "return" | null>(null);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://kin-sight-app.vercel.app";
  const importUrl = useMemo(() => contactsImportUrl(origin), [origin]);
  const returnUrl = useMemo(() => contactsSyncedReturnUrl(origin), [origin]);

  if (!open) return null;

  const copy = async (value: string, which: "import" | "return") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[110px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-sync-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close import contacts"
        onClick={onClose}
      />
      <div className="ui-card relative max-h-[min(560px,calc(100dvh-140px))] w-full max-w-md overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-hotel-border px-5 py-4">
          <div>
            <p className="type-meta text-muted">Phone contacts</p>
            <h2
              id="phone-sync-title"
              className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
            >
              Sync from iPhone
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 text-sm leading-relaxed text-muted">
          <p className="text-foreground">
            The shortcut is not in KinSight — it lives in Apple&apos;s Shortcuts
            app. Create it once, named exactly{" "}
            <span className="font-medium">{KINSIGHT_CONTACTS_SHORTCUT_NAME}</span>
            . Then two taps: Sync, then Allow.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-foreground">
            <li>
              Open the Shortcuts app → New Shortcut. Name it{" "}
              <span className="font-medium">{KINSIGHT_CONTACTS_SHORTCUT_NAME}</span>{" "}
              (must match exactly).
            </li>
            <li>
              Add <span className="font-medium">Find Contacts</span>. Turn{" "}
              <span className="font-medium">Limit</span> off.
            </li>
            <li>
              Add <span className="font-medium">Repeat with Each</span>. Inside
              the repeat, add <span className="font-medium">Text</span> with
              five pieces from Repeat Item, each separated by a tab: Name, Phone
              Number, Email Address, Company, Job Title. Then{" "}
              <span className="font-medium">Add to Variable</span> named{" "}
              <span className="font-medium">rows</span>.
            </li>
            <li>
              After the repeat, add <span className="font-medium">Text</span>{" "}
              whose first line is{" "}
              <code className="text-xs">name[tab]phone[tab]email[tab]company[tab]role</code>{" "}
              and whose next lines are the <span className="font-medium">rows</span>{" "}
              variable.
            </li>
            <li>
              Add <span className="font-medium">Get Contents of URL</span>.
              Method <span className="font-medium">POST</span>. Request Body:{" "}
              <span className="font-medium">File</span> (the Text from the
              previous step). Header{" "}
              <code className="text-xs">Content-Type: text/plain</code>. URL:
              <CopyRow
                value={importUrl}
                copied={copied === "import"}
                onCopy={() => void copy(importUrl, "import")}
              />
            </li>
            <li>
              Add <span className="font-medium">Open URLs</span>:
              <CopyRow
                value={returnUrl}
                copied={copied === "return"}
                onCopy={() => void copy(returnUrl, "return")}
              />
            </li>
          </ol>
          <p>
            First run asks for Contacts and network. After that it is two taps:
            Sync, then Allow. A large address book can take a minute. You can
            also add the Shortcut itself to the Home Screen and tap only that.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-hotel-border px-5 py-4">
          <button
            type="button"
            onClick={onCreateShortcut}
            className="ui-btn-green flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
          >
            <Smartphone className="h-4 w-4" strokeWidth={2} />
            Create shortcut (copies the name)
          </button>
          <button
            type="button"
            onClick={onRunShortcut}
            className="ui-btn-outline-green flex w-full items-center justify-center px-4 py-2.5 text-sm"
          >
            I&apos;ve added it — Sync now
          </button>
          <label className="ui-btn-outline-green flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-sm">
            Choose vCard or CSV instead
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function CopyRow({
  value,
  copied,
  onCopy,
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <span className="mt-1 flex items-center gap-1.5">
      <code className="block min-w-0 flex-1 truncate text-xs text-muted">
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
        aria-label="Copy URL"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        )}
      </button>
    </span>
  );
}
