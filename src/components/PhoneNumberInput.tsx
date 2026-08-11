"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CountryCodePickerSheet } from "@/components/CountryCodePickerSheet";
import {
  buildPhoneE164,
  detectDefaultPhoneCountry,
  extractNationalDigitsFromInput,
  formatCountryPillLabel,
  formatNationalPhoneDisplay,
  isPhoneInputModifierEvent,
  isPhoneInputNavigationKey,
  parseStoredPhone,
  type PhoneCountry,
} from "@/lib/contacts/phone-input";

interface PhoneNumberInputProps {
  value: string;
  onChange: (e164: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: "inline" | "field";
  defaultCountry?: PhoneCountry;
  "aria-label"?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  className = "",
  inputClassName = "",
  placeholder = "Phone number",
  disabled = false,
  variant = "inline",
  defaultCountry,
  "aria-label": ariaLabel = "Phone number",
}: PhoneNumberInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [country, setCountry] = useState<PhoneCountry>(
    () => defaultCountry ?? detectDefaultPhoneCountry()
  );
  const [nationalDigits, setNationalDigits] = useState("");

  useEffect(() => {
    const parsed = parseStoredPhone(
      value,
      defaultCountry ?? detectDefaultPhoneCountry()
    );
    setCountry(parsed.country);
    setNationalDigits(parsed.nationalDigits);
  }, [value, defaultCountry]);

  const displayValue = formatNationalPhoneDisplay(country, nationalDigits);

  const commitDigits = (nextDigits: string, nextCountry = country) => {
    setNationalDigits(nextDigits);
    setCountry(nextCountry);
    onChange(buildPhoneE164(nextCountry, nextDigits));
  };

  const handleCountrySelect = (nextCountry: PhoneCountry) => {
    commitDigits(nationalDigits, nextCountry);
  };

  const handleInputChange = (inputValue: string) => {
    commitDigits(extractNationalDigitsFromInput(country, inputValue));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPhoneInputNavigationKey(event.key) || isPhoneInputModifierEvent(event)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const rootClassName = [
    "phone-number-input",
    variant === "field" ? "phone-number-input--field" : "phone-number-input--inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inputClasses = [
    variant === "field" ? "phone-number-input__input--field ui-input" : "phone-number-input__input",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={rootClassName}>
        <button
          type="button"
          className="phone-number-input__country"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
          aria-label={`Country code ${formatCountryPillLabel(country)}`}
        >
          {formatCountryPillLabel(country)}
          <span aria-hidden>›</span>
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={displayValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text");
            handleInputChange(pasted);
          }}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled}
          aria-label={ariaLabel}
        />
      </div>

      <CountryCodePickerSheet
        open={pickerOpen}
        currentCountry={country}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCountrySelect}
      />
    </>
  );
}
