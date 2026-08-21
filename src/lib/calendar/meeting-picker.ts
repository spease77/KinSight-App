export type MeetingActivePicker =
  | "start-date"
  | "start-time"
  | "end-date"
  | "end-time"
  | null;

export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const [date = "", time = "00:00"] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

export function joinDatetimeLocal(date: string, time: string): string {
  return `${date}T${time}`;
}

export function formatDatePill(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Select date";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimePill(time: string): string {
  const parsed = new Date(`1970-01-01T${time}`);
  if (Number.isNaN(parsed.getTime())) return "Select time";

  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseDateParts(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTime24(time: string): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} {
  const [hourPart, minutePart] = time.split(":");
  const hour24 = Number(hourPart);
  const minute = Number(minutePart);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour12, minute, period };
}

export function toTime24(
  hour12: number,
  minute: number,
  period: "AM" | "PM"
): string {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function applyAllDayTimes(
  startValue: string,
  endValue: string
): { start: string; end: string } {
  const startParts = splitDatetimeLocal(startValue);
  const endParts = splitDatetimeLocal(endValue);

  return {
    start: joinDatetimeLocal(startParts.date, "00:00"),
    end: joinDatetimeLocal(endParts.date, "23:59"),
  };
}

export const MEETING_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

export const MEETING_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);

export const MEETING_PERIOD_OPTIONS = ["AM", "PM"] as const;

export function clampHour12(value: number): number {
  if (value < 1) return 1;
  if (value > 12) return 12;
  return value;
}

export function clampMinute(value: number): number {
  if (value < 0) return 0;
  if (value > 59) return 59;
  return value;
}

/** iPhone-style shifting digit entry over HHMM. */
export function applySequentialTimeDigit(
  hour12: number,
  minute: number,
  digit: string
): { hour12: number; minute: number } {
  const hhmm = `${String(hour12).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
  const next = `${hhmm.slice(1)}${digit}`.slice(-4);
  const nextHour = clampHour12(parseInt(next.slice(0, 2), 10) || 1);
  const nextMinute = clampMinute(parseInt(next.slice(2, 4), 10) || 0);
  return { hour12: nextHour, minute: nextMinute };
}

export function applySequentialTimeBackspace(
  hour12: number,
  minute: number
): { hour12: number; minute: number } {
  const hhmm = `${String(hour12).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
  const next = `0${hhmm.slice(0, 3)}`;
  const nextHour = clampHour12(parseInt(next.slice(0, 2), 10) || 1);
  const nextMinute = clampMinute(parseInt(next.slice(2, 4), 10) || 0);
  return { hour12: nextHour, minute: nextMinute };
}

/** iOS-style shifting digit entry for a single wheel column (hour or minute). */
export function applyFieldDigit(
  current: number,
  digit: string,
  min: number,
  max: number
): number {
  const padded = String(current).padStart(2, "0");
  const next = `${padded.slice(1)}${digit}`;
  const parsed = parseInt(next, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function applyFieldBackspace(current: number, min: number): number {
  const padded = String(current).padStart(2, "0");
  const parsed = parseInt(`0${padded.slice(0, 1)}`, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, parsed);
}

export function shouldDismissHourKeypad(digitCount: number, lastDigit: string): boolean {
  if (digitCount >= 2) return true;
  return digitCount === 1 && lastDigit >= "2" && lastDigit <= "9";
}

export function shouldDismissMinuteKeypad(digitCount: number): boolean {
  return digitCount >= 2;
}
