"use client";

interface MeetingIosSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  accent?: "gold" | "indigo";
}

export function MeetingIosSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  accent = "gold",
}: MeetingIosSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`meeting-ios-switch relative h-[1.875rem] w-[3.25rem] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked
          ? accent === "indigo"
            ? "meeting-ios-switch--indigo"
            : "meeting-ios-switch--on"
          : "meeting-ios-switch--off"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-[1.375rem] w-[1.375rem] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[1.35rem]" : "translate-x-0"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
