function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date and time.");
  }
  return parsed.toISOString();
}

export function defaultMeetingStartLocal(): string {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);
  return toDatetimeLocalValue(start);
}

export function defaultMeetingEndLocal(startValue: string): string {
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) {
    return defaultMeetingStartLocal();
  }
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return toDatetimeLocalValue(end);
}
