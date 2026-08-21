"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import {
  MEETING_HOUR_OPTIONS,
  MEETING_MINUTE_OPTIONS,
  MEETING_PERIOD_OPTIONS,
  applyFieldBackspace,
  applyFieldDigit,
  parseTime24,
  shouldDismissHourKeypad,
  shouldDismissMinuteKeypad,
  toTime24,
} from "@/lib/calendar/meeting-picker";

const WHEEL_ITEM_HEIGHT = 41;
const WHEEL_VISIBLE_HEIGHT = 203;
const WHEEL_EDGE_PADDING = (WHEEL_VISIBLE_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;
const SCROLL_END_FALLBACK_MS = 48;

type KeypadField = "hour" | "minute";

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
  onTapSelected?: () => void;
}

function WheelColumn<T extends string | number>({
  values,
  selected,
  onSelect,
  format = (value) => String(value),
  className = "",
  onTapSelected,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollRef = useRef(false);
  const didScrollDuringGestureRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

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

  const snapToNearest = useCallback(() => {
    if (!scrollRef.current) return;

    const index = Math.round(scrollRef.current.scrollTop / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    const next = values[clamped];
    const targetTop = clamped * WHEEL_ITEM_HEIGHT;

    if (Math.abs(scrollRef.current.scrollTop - targetTop) > 0.5) {
      scrollRef.current.scrollTo({ top: targetTop, behavior: "auto" });
    }

    if (next !== selected) onSelect(next);
    isUserScrollRef.current = false;
    didScrollDuringGestureRef.current = false;
  }, [onSelect, selected, values]);

  useEffect(() => {
    if (isUserScrollRef.current) return;
    scrollToValue(selected);
  }, [selected, scrollToValue]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScrollEnd = () => {
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = null;
      }
      snapToNearest();
    };

    element.addEventListener("scrollend", handleScrollEnd);
    return () => element.removeEventListener("scrollend", handleScrollEnd);
  }, [snapToNearest]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    isUserScrollRef.current = true;
    didScrollDuringGestureRef.current = true;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const index = Math.round(scrollRef.current.scrollTop / WHEEL_ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, index));
      const next = values[clamped];
      if (next !== selected) onSelect(next);
    });

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null;
      snapToNearest();
    }, SCROLL_END_FALLBACK_MS);
  };

  const handleItemClick = (item: T) => {
    if (didScrollDuringGestureRef.current) {
      didScrollDuringGestureRef.current = false;
      return;
    }

    if (item === selected) {
      onTapSelected?.();
      return;
    }

    onSelect(item);
    scrollToValue(item, "auto");
  };

  return (
    <div className={`relative min-w-0 shrink-0 ${className}`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="meeting-time-wheel-column h-[12.6875rem] overflow-y-auto overscroll-y-contain"
      >
        <div style={{ height: WHEEL_EDGE_PADDING }} aria-hidden="true" />
        {values.map((item) => {
          const active = item === selected;
          return (
            <button
              key={String(item)}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`meeting-time-wheel-item flex w-full snap-center items-center justify-center text-[1.463rem] leading-none ${
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

interface TimeFieldKeypadProps {
  field: KeypadField;
  hour12: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onDismiss: () => void;
}

function TimeFieldKeypad({
  field,
  hour12,
  minute,
  onHourChange,
  onMinuteChange,
  onDismiss,
}: TimeFieldKeypadProps) {
  const digitCountRef = useRef(0);

  useEffect(() => {
    digitCountRef.current = 0;
  }, [field]);

  const applyDigit = (digit: string) => {
    digitCountRef.current += 1;

    if (field === "hour") {
      const nextHour = applyFieldDigit(hour12, digit, 1, 12);
      onHourChange(nextHour);
      if (shouldDismissHourKeypad(digitCountRef.current, digit)) {
        onDismiss();
      }
      return;
    }

    const nextMinute = applyFieldDigit(minute, digit, 0, 59);
    onMinuteChange(nextMinute);
    if (shouldDismissMinuteKeypad(digitCountRef.current)) {
      onDismiss();
    }
  };

  const applyBackspace = () => {
    digitCountRef.current = Math.max(0, digitCountRef.current - 1);
    if (field === "hour") {
      onHourChange(applyFieldBackspace(hour12, 1));
      return;
    }
    onMinuteChange(applyFieldBackspace(minute, 0));
  };

  const valueLabel =
    field === "hour" ? String(hour12) : String(minute).padStart(2, "0");

  return (
    <div className="meeting-time-keypad-sheet" role="dialog" aria-label={`Enter ${field}`}>
      <div className="meeting-time-keypad-toolbar">
        <span className="meeting-time-keypad-toolbar-label">
          {field === "hour" ? "Hour" : "Minute"}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="meeting-time-keypad-done"
        >
          Done
        </button>
      </div>

      <div className="meeting-time-keypad-value" aria-live="polite">
        {valueLabel}
      </div>

      <div className="meeting-time-numpad grid">
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
                className="meeting-time-numpad-key meeting-time-numpad-key--action flex items-center justify-center"
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
  const [activeKeypad, setActiveKeypad] = useState<KeypadField | null>(null);
  const { hour12, minute, period } = parseTime24(value);

  const updateTime = (
    nextHour: number,
    nextMinute: number,
    nextPeriod: "AM" | "PM"
  ) => {
    onChange(toTime24(nextHour, nextMinute, nextPeriod));
  };

  const openKeypad = (field: KeypadField) => {
    setActiveKeypad(field);
  };

  const closeKeypad = () => {
    setActiveKeypad(null);
  };

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
              onTapSelected={() => openKeypad("hour")}
            />
            <WheelColumn
              className="meeting-time-wheel-minute"
              values={MEETING_MINUTE_OPTIONS}
              selected={minute}
              onSelect={(nextMinute) => updateTime(hour12, nextMinute, period)}
              format={(minuteValue) => String(minuteValue).padStart(2, "0")}
              onTapSelected={() => openKeypad("minute")}
            />

            <span className="meeting-time-wheel-colon" aria-hidden="true">
              :
            </span>

            <div
              className="meeting-time-wheel-lens meeting-time-wheel-lens--time pointer-events-none"
              aria-hidden="true"
            />
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

      {activeKeypad ? (
        <>
          <button
            type="button"
            className="meeting-time-keypad-backdrop"
            aria-label="Close numeric keypad"
            onClick={closeKeypad}
          />
          <TimeFieldKeypad
            field={activeKeypad}
            hour12={hour12}
            minute={minute}
            onHourChange={(nextHour) => updateTime(nextHour, minute, period)}
            onMinuteChange={(nextMinute) => updateTime(hour12, nextMinute, period)}
            onDismiss={closeKeypad}
          />
        </>
      ) : null}
    </div>
  );
}
