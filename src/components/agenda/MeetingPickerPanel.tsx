"use client";

interface MeetingPickerPanelProps {
  open: boolean;
  children: React.ReactNode;
}

export function MeetingPickerPanel({ open, children }: MeetingPickerPanelProps) {
  return (
    <div
      className={`meeting-picker-panel grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <div className="border-t border-border-green/30">{children}</div>
      </div>
    </div>
  );
}
