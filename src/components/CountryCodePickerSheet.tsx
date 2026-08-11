"use client";

import { useEffect, useState } from "react";
import { LabelPickerModalFrame } from "@/components/LabelPickerModalFrame";
import {
  countryFlagEmoji,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "@/lib/contacts/phone-input";

interface CountryCodePickerSheetProps {
  open: boolean;
  currentCountry: PhoneCountry;
  onClose: () => void;
  onSelect: (country: PhoneCountry) => void;
}

export function CountryCodePickerSheet({
  open,
  currentCountry,
  onClose,
  onSelect,
}: CountryCodePickerSheetProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <LabelPickerModalFrame
      open={open}
      entered={entered}
      title="Country Code"
      ariaLabel="Choose country code"
      onClose={onClose}
    >
      <div className="label-picker-sheet__group">
        {PHONE_COUNTRIES.map((country) => {
          const selected = country.iso2 === currentCountry.iso2;
          return (
            <button
              key={country.iso2}
              type="button"
              className={`label-picker-sheet__option phone-country-option ${
                selected ? "label-picker-sheet__option--selected" : ""
              }`}
              onClick={() => {
                onSelect(country);
                onClose();
              }}
            >
              <span className="phone-country-option__label">
                <span className="phone-country-option__flag" aria-hidden>
                  {countryFlagEmoji(country.iso2)}
                </span>
                <span>{country.name}</span>
              </span>
              <span className="phone-country-option__meta">
                +{country.dialCode}
              </span>
              {selected ? (
                <span className="label-picker-sheet__option-check" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </LabelPickerModalFrame>
  );
}
