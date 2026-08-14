"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  getContactInitial,
  getContactInitials,
  type ContactSortField,
} from "@/lib/contacts/sort-contacts";

const CONTACT_AVATAR_PLACEHOLDER_SRC = "/images/contact-bust-placeholder.png";

type ContactAvatarSize = "sm" | "lg" | "detail" | "hero" | "xl";
type ContactAvatarPlaceholder = "initials" | "silhouette";

const SIZE_CLASSES: Record<ContactAvatarSize, string> = {
  sm: "h-14 w-14 text-lg",
  lg: "h-16 w-16 text-2xl",
  detail: "h-40 w-40 text-5xl",
  hero: "h-[13.5rem] w-[13.5rem] text-6xl",
  xl: "h-44 w-44 text-4xl sm:h-52 sm:w-52 sm:text-5xl",
};

const IMAGE_SIZES: Record<ContactAvatarSize, string> = {
  sm: "56px",
  lg: "64px",
  detail: "160px",
  hero: "216px",
  xl: "(max-width: 640px) 176px, 208px",
};

const IOS_INITIALS_SIZES = new Set<ContactAvatarSize>(["hero", "detail"]);

interface ContactAvatarProps {
  name: string;
  sortBy?: ContactSortField;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: ContactAvatarSize;
  placeholder?: ContactAvatarPlaceholder;
  className?: string;
}

function ContactAvatarSilhouette({
  name,
  sizeClass,
  className,
  size,
}: {
  name: string;
  sizeClass: string;
  className: string;
  size: ContactAvatarSize;
}) {
  return (
    <div
      className={`contact-avatar-silhouette relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizeClass} ${className}`}
      aria-label={`${name} photo placeholder`}
    >
      <Image
        src={CONTACT_AVATAR_PLACEHOLDER_SRC}
        alt=""
        fill
        className="contact-avatar-silhouette__photo object-cover"
        sizes={IMAGE_SIZES[size]}
        unoptimized
        priority={size === "hero"}
      />
    </div>
  );
}

export function ContactAvatar({
  name,
  sortBy = "first",
  firstName,
  lastName,
  avatarUrl,
  size = "sm",
  placeholder = "initials",
  className = "",
}: ContactAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const trimmedAvatarUrl = avatarUrl?.trim() ?? "";
  const [imageFailed, setImageFailed] = useState(false);
  const useIosInitials = IOS_INITIALS_SIZES.has(size);

  useEffect(() => {
    setImageFailed(false);
  }, [trimmedAvatarUrl]);

  const showPhoto = trimmedAvatarUrl.length > 0 && !imageFailed;

  if (showPhoto) {
    return (
      <div
        className={`avatar-ring-contact relative shrink-0 overflow-hidden rounded-full ${sizeClass} ${className}`}
      >
        <Image
          src={trimmedAvatarUrl}
          alt={`${name} profile photo`}
          fill
          className="object-cover"
          sizes={IMAGE_SIZES[size]}
          unoptimized
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  if (placeholder === "silhouette") {
    return (
      <ContactAvatarSilhouette
        name={name}
        sizeClass={sizeClass}
        className={className}
        size={size}
      />
    );
  }

  if (useIosInitials) {
    const initials = getContactInitials(name, firstName, lastName);

    return (
      <div
        className={`contact-avatar-initials contact-avatar-initials--hero flex shrink-0 items-center justify-center rounded-full font-sans font-medium tracking-tight text-white/95 ${sizeClass} ${className}`}
        aria-label={`${name} initials`}
      >
        {initials}
      </div>
    );
  }

  const initial = getContactInitial(name, sortBy);

  return (
    <div
      className={`avatar-ring-contact flex shrink-0 items-center justify-center rounded-full font-sans font-normal text-foreground ${sizeClass} ${className}`}
      aria-label={`${name} initials`}
    >
      {initial}
    </div>
  );
}
