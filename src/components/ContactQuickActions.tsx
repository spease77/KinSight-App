"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  Phone,
  Video,
} from "lucide-react";
import {
  getContactEmailOptions,
  buildMailtoHref,
  type ContactEmailOption,
} from "@/lib/contacts/contact-emails";
import {
  buildFacetimeHref,
  buildSmsHref,
  buildTelHref,
  getContactPhoneOptions,
  type ContactPhoneOption,
} from "@/lib/contacts/contact-phone";
import type { ContactProfile } from "@/types/contact-profile";

type PhoneActionKind = "text" | "call" | "video";
type PopoverKind = PhoneActionKind | "mail";

type PopoverAnchor = {
  top: number;
  left: number;
  width: number;
};

type PopoverState = {
  kind: PopoverKind;
  anchor: PopoverAnchor;
} | null;

interface ContactQuickActionsProps {
  profile?: ContactProfile | null;
  className?: string;
}

function buildPhoneActionHref(kind: PhoneActionKind, e164: string): string {
  switch (kind) {
    case "text":
      return buildSmsHref(e164);
    case "call":
      return buildTelHref(e164);
    case "video":
      return buildFacetimeHref(e164);
  }
}

function triggerNativeAction(href: string) {
  window.location.assign(href);
}

function anchorFromElement(element: HTMLElement): PopoverAnchor {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.bottom,
    left: rect.left + rect.width / 2,
    width: rect.width,
  };
}

function ContactQuickActionPopover({
  kind,
  anchor,
  phoneOptions,
  emailOptions,
  onClose,
}: {
  kind: PopoverKind;
  anchor: PopoverAnchor;
  phoneOptions: ContactPhoneOption[];
  emailOptions: ContactEmailOption[];
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const rect = popover.getBoundingClientRect();
    const margin = 12;
    let shiftX = 0;

    if (rect.left < margin) {
      shiftX = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      shiftX = window.innerWidth - margin - rect.right;
    }

    if (shiftX !== 0) {
      popover.style.transform = `translateX(calc(-50% + ${shiftX}px))`;
    }
  }, [anchor.left, anchor.top]);

  const phoneKind =
    kind === "text" || kind === "call" || kind === "video" ? kind : null;

  const title =
    kind === "mail"
      ? "Send Email"
      : kind === "text"
        ? "Send Message"
        : kind === "call"
          ? "Call"
          : "Video";

  return (
    <>
      <button
        type="button"
        className="contact-quick-action-popover__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        className="contact-quick-action-popover"
        role="menu"
        aria-label={title}
        style={{
          top: anchor.top + 10,
          left: anchor.left,
        }}
      >
        {phoneKind &&
          phoneOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              className="contact-quick-action-popover__item"
              onClick={() => {
                triggerNativeAction(buildPhoneActionHref(phoneKind, option.e164));
                onClose();
              }}
            >
              <span className="contact-quick-action-popover__label">
                {option.label.toLowerCase()}
              </span>
              <span className="contact-quick-action-popover__value">
                {option.display}
              </span>
            </button>
          ))}

        {kind === "mail" &&
          emailOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              className="contact-quick-action-popover__item"
              onClick={() => {
                triggerNativeAction(buildMailtoHref(option.email));
                onClose();
              }}
            >
              <span className="contact-quick-action-popover__label">
                {option.label.toLowerCase()}
              </span>
              <span className="contact-quick-action-popover__value">
                {option.email}
              </span>
            </button>
          ))}
      </div>
    </>
  );
}

function FilledEnvelopeIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.01L12 13 4 8.01V6l8 5 8-5v2.01z" />
    </svg>
  );
}

const QUICK_ACTION_ICON_PROPS = {
  className: "contact-quick-action__icon",
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: 0,
  "aria-hidden": true,
} as const;

function QuickActionButton({
  icon,
  label,
  disabled,
  disabledReason,
  buttonRef,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="contact-quick-action__btn"
      disabled={disabled}
      onClick={onClick}
      aria-label={
        disabled
          ? `${label} unavailable — ${disabledReason ?? "No contact info"}`
          : label
      }
      title={
        disabled
          ? disabledReason ?? "No contact info on file"
          : label
      }
    >
      {icon}
    </button>
  );
}

export function ContactQuickActions({
  profile,
  className,
}: ContactQuickActionsProps) {
  const phoneOptions = useMemo(
    () => getContactPhoneOptions(profile),
    [profile]
  );
  const emailOptions = useMemo(
    () => getContactEmailOptions(profile ?? undefined),
    [profile]
  );

  const textRef = useRef<HTMLButtonElement>(null);
  const callRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLButtonElement>(null);
  const mailRef = useRef<HTMLButtonElement>(null);

  const [popover, setPopover] = useState<PopoverState>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const handlePhoneAction = useCallback(
    (kind: PhoneActionKind, buttonRef: RefObject<HTMLButtonElement | null>) => {
      if (phoneOptions.length === 0) return;

      if (phoneOptions.length === 1) {
        triggerNativeAction(
          buildPhoneActionHref(kind, phoneOptions[0].e164)
        );
        return;
      }

      const element = buttonRef.current;
      if (!element) return;

      setPopover({
        kind,
        anchor: anchorFromElement(element),
      });
    },
    [phoneOptions]
  );

  const handleMailAction = useCallback(() => {
    if (emailOptions.length === 0) return;

    if (emailOptions.length === 1) {
      triggerNativeAction(buildMailtoHref(emailOptions[0].email));
      return;
    }

    const element = mailRef.current;
    if (!element) return;

    setPopover({
      kind: "mail",
      anchor: anchorFromElement(element),
    });
  }, [emailOptions]);

  const phoneDisabledReason = "No phone number on file";
  const mailDisabledReason = "No email on file";

  return (
    <div className={`contact-quick-actions ${className ?? ""}`}>
      <div className="contact-quick-actions__row">
        <QuickActionButton
          icon={<MessageCircle {...QUICK_ACTION_ICON_PROPS} />}
          label="Text"
          disabled={phoneOptions.length === 0}
          disabledReason={phoneDisabledReason}
          buttonRef={textRef}
          onClick={() => handlePhoneAction("text", textRef)}
        />
        <QuickActionButton
          icon={<Phone {...QUICK_ACTION_ICON_PROPS} />}
          label="Call"
          disabled={phoneOptions.length === 0}
          disabledReason={phoneDisabledReason}
          buttonRef={callRef}
          onClick={() => handlePhoneAction("call", callRef)}
        />
        <QuickActionButton
          icon={<Video {...QUICK_ACTION_ICON_PROPS} />}
          label="Video"
          disabled={phoneOptions.length === 0}
          disabledReason={phoneDisabledReason}
          buttonRef={videoRef}
          onClick={() => handlePhoneAction("video", videoRef)}
        />
        <QuickActionButton
          icon={<FilledEnvelopeIcon className="contact-quick-action__icon" />}
          label="Mail"
          disabled={emailOptions.length === 0}
          disabledReason={mailDisabledReason}
          buttonRef={mailRef}
          onClick={handleMailAction}
        />
      </div>

      {portalReady &&
        popover &&
        createPortal(
          <ContactQuickActionPopover
            kind={popover.kind}
            anchor={popover.anchor}
            phoneOptions={phoneOptions}
            emailOptions={emailOptions}
            onClose={closePopover}
          />,
          document.body
        )}
    </div>
  );
}
