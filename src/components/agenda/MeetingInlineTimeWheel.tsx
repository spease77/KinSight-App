"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Delete } from "lucide-react";
import {
  MEETING_HOUR_OPTIONS,
  MEETING_MINUTE_OPTIONS,
  MEETING_PERIOD_OPTIONS,
  applySequentialTimeBackspace,
  applySequentialTimeDigit,
  parseTime24,
  toTime24,
} from "@/lib/calendar/meeting-picker";

const WHEEL_ITEM_HEIGHT = 41;
const WHEEL_VISIBLE_HEIGHT = 203;
const WHEEL_EDGE_PADDING = (WHEEL_VISIBLE_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;

type TimeInputMode = "wheel" | "manual";

interface MeetingInlineTimeWheelProps {
  value: string;
  onChange: (time: string) => void;
}

interface WheelColumnProps<T extends string | number> {
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
  className?: string;
  onEnterManual?: () => void;
}

function WheelColumn<T extends string | number>({
  values,
  selected,
  onSelect,
  format = (value) => String(value),
  className = "",
  onEnterManual,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);

  const scrollToValue = useCallback(
    (value: T, behavior: ScrollBehavior = "auto") => {
      const index = values.indexOf(value);
      if (index < 0 || !scrollRef.current) return;
      scrollRef.current.scrollTo({
        top: index * WHEEL_ITEM_HEIGHT,
        behavior,
      });
    },
    [values]
  );

  useEffect(() => {
    if (isUserScrollRef.current) return;
    scrollToValue(selected);
  }, [selected, scrollToValue]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    isUserScrollRef.current = true;

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      if (!scrollRef.current) return;
      const index = Math.round(scrollRef.current.scrollTop / WHEEL_ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, index));
      const next = values[clamped];
      if (next !== selected) onSelect(next);
      scrollToValue(next, "smooth");
      isUserScrollRef.current = false;
    }, 80);
  };

  return (
    <div className={`relative min-w-0 shrink-0 ${className}`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="meeting-time-wheel-column h-[12.6875rem] overflow-y-auto"
      >
        <div style={{ height: WHEEL_EDGE_PADDING }} aria-hidden="true" />
        {values.map((item) => {
          const active = item === selected;
          return (
            <button
              key={String(item)}
              type="button"
              onClick={() => {
                onSelect(item);
                scrollToValue(item, "smooth");
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                onEnterManual?.();
              }}
              className={`meeting-time-wheel-item flex w-full snap-center items-center justify-center text-[1.463rem] leading-none transition-[color,opacity,transform] duration-150 ${
                active
                  ? "font-semibold text-accent-primary-bright"
                  : "font-normal text-muted/55"
              }`}
              style={{ height: WHEEL_ITEM_HEIGHT }}
            >
              {format(item)}
            </button>
          );
        })}
        <div style={{ height: WHEEL_EDGE_PADDING }} aria-hidden="true" />
      </div>
    </div>
  );
}

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

interface MeetingTimeManualEntryProps {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
  onTimeChange: (hour12: number, minute: number, period: "AM" | "PM") => void;
  onToggleMode: () => void;
}

function MeetingTimeManualEntry({
  hour12,
  minute,
  period,
  onTimeChange,
  onToggleMode,
}: MeetingTimeManualEntryProps) {
  const captureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    captureRef.current?.focus({ preventScroll: true });
  }, []);

  const applyDigit = (digit: string) => {
    const next = applySequentialTimeDigit(hour12, minute, digit);
    onTimeChange(next.hour12, next.minute, period);
  };

  const applyBackspace = () => {
    const next = applySequentialTimeBackspace(hour12, minute);
    onTimeChange(next.hour12, next.minute, period);
  };

  const handleCaptureKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key >= "0" && event.key <= "9") {
      event.preventDefault();
      applyDigit(event.key);
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      applyBackspace();
    }
  };

  const handleCaptureInput = (event: FormEvent<HTMLInputElement>) => {
    const digit = event.currentTarget.value.replace(/\D/g, "").slice(-1);
    event.currentTarget.value = "";
    if (digit) applyDigit(digit);
  };

  const hourLabel = String(hour12).padStart(2, "0");
  const minuteLabel = String(minute).padStart(2, "0");

  return (
    <div className="px-3 py-3">
      <div
        className="relative mx-auto w-full max-w-[11rem] md:max-w-xs"
        onDoubleClick={onToggleMode}
      >
        <input
          ref={captureRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Enter time digits"
          className="meeting-time-manual-capture"
          onKeyDown={handleCaptureKeyDown}
          onInput={handleCaptureInput}
        />

        <div
          className="pointer-events-none flex items-center justify-center gap-0.5 rounded-xl px-2 py-3 md:gap-2"
          aria-hidden="true"
        >
          <span className="meeting-time-manual-field">{hourLabel}</span>
          <span className="pb-0.5 text-[1.406rem] font-light text-accent-primary-bright">:</span>
          <span className="meeting-time-manual-field">{minuteLabel}</span>
          <span className="meeting-time-manual-period">{period}</span>
        </div>
      </div>

      <p className="mt-1 text-center text-[11px] text-muted md:hidden">
        Type on your keypad — digits fill hour, then minutes. Double-tap to use the wheel.
      </p>

      <div className="meeting-time-numpad mt-3 hidden md:grid">
        <div className="col-span-3 mb-1 flex justify-center gap-2">
          {MEETING_PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onTimeChange(hour12, minute, option)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                period === option
                  ? "bg-accent-primary-muted text-accent-primary-bright"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {NUMPAD_KEYS.map((key, index) => {
          if (key === "") {
            return <div key={`spacer-${index}`} aria-hidden="true" />;
          }

          if (key === "back") {
            return (
              <button
                key="back"
                type="button"
                onClick={applyBackspace}
                className="meeting-time-numpad-key flex items-center justify-center"
                aria-label="Delete digit"
              >
                <Delete className="h-5 w-5" strokeWidth={2} />
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => applyDigit(key)}
              className="meeting-time-numpad-key"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MeetingInlineTimeWheel({
  value,
  onChange,
}: MeetingInlineTimeWheelProps) {
  const [inputMode, setInputMode] = useState<TimeInputMode>("wheel");
  const { hour12, minute, period } = parseTime24(value);

  const updateTime = (
    nextHour: number,
    nextMinute: number,
    nextPeriod: "AM" | "PM"
  ) => {
    onChange(toTime24(nextHour, nextMinute, nextPeriod));
  };

  const enterManualMode = () => {
    setInputMode("manual");
  };

  const exitManualMode = () => {
    setInputMode("wheel");
  };

  if (inputMode === "manual") {
    return (
      <div className="meeting-inline-time-wheel">
        <MeetingTimeManualEntry
          hour12={hour12}
          minute={minute}
          period={period}
          onTimeChange={updateTime}
          onToggleMode={exitManualMode}
        />
      </div>
    );
  }

  return (
    <div className="meeting-inline-time-wheel relative px-2 py-2">
      <div className="meeting-time-wheel-viewport relative">
        <div className="relative z-0 flex items-stretch justify-center">
          <div className="meeting-time-wheel-time-group relative flex shrink-0">
            <WheelColumn
              className="meeting-time-wheel-hour"
              values={MEETING_HOUR_OPTIONS}
              selected={hour12}
              onSelect={(nextHour) => updateTime(nextHour, minute, period)}
              onEnterManual={enterManualMode}
            />
            <WheelColumn
              className="meeting-time-wheel-minute"
              values={MEETING_MINUTE_OPTIONS}
              selected={minute}
              onSelect={(nextMinute) => updateTime(hour12, nextMinute, period)}
              format={(minuteValue) => String(minuteValue).padStart(2, "0")}
              onEnterManual={enterManualMode}
            />

            <span className="meeting-time-wheel-colon" aria-hidden="true">
              :
            </span>

            <button
              type="button"
              onDoubleClick={enterManualMode}
              className="meeting-time-wheel-lens meeting-time-wheel-lens--time"
              aria-label="Double-tap to enter time manually"
            >
              <span className="sr-only">
                {String(hour12).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
            </button>
          </div>

          <WheelColumn
            className="meeting-time-wheel-period"
            values={MEETING_PERIOD_OPTIONS}
            selected={period}
            onSelect={(nextPeriod) => updateTime(hour12, minute, nextPeriod)}
          />
        </div>

        <div
          className="meeting-time-wheel-fade pointer-events-none absolute inset-0 z-10"
          aria-hidden="true"
        />
      </div>

      <p className="mt-1 text-center text-[10px] text-muted/80 md:hidden">
        Double-tap the time to type with your keypad
      </p>
    </div>
  );
}
