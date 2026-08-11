export function formatTimeInvested(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (m === 0) {
    return `${h}h`;
  }

  return `${h}h ${m}m`;
}

export function formatDurationMinutes(totalMinutes: number): string {
  return formatTimeInvested(totalMinutes);
}

export function hasLoggedTimeInvested(
  totalMinutes: number | null | undefined
): boolean {
  return (totalMinutes ?? 0) > 0;
}

export function formatRemainingMinutes(remainingMinutes: number): string {
  return `${formatDurationMinutes(remainingMinutes)} remaining`;
}

export function todayForDateInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dateInputToLoggedAt(dateInput: string): string | null {
  const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const hoursWithMinutes = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/
  );
  if (hoursWithMinutes) {
    const hours = Number(hoursWithMinutes[1]);
    const minutes = hoursWithMinutes[2] ? Number(hoursWithMinutes[2]) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60) {
      return null;
    }
    const total = Math.round(hours * 60 + minutes);
    return total > 0 ? total : null;
  }

  const minutesOnly = trimmed.match(/^(\d+)\s*m$/);
  if (minutesOnly) {
    const total = Number(minutesOnly[1]);
    return total > 0 ? total : null;
  }

  const plain = Number(trimmed);
  if (Number.isFinite(plain) && plain > 0) {
    return Math.round(plain);
  }

  return null;
}

export function resolveLoggedDurationMinutes(
  minutes: string,
  adjustment: "add" | "subtract"
): number | null {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const rounded = Math.round(value);
  return adjustment === "subtract" ? -rounded : rounded;
}

export function formatLoggedDurationAction(
  signedMinutes: number
): { verb: "Logged" | "Removed"; label: string } {
  const label = formatDurationMinutes(Math.abs(signedMinutes));
  return {
    verb: signedMinutes < 0 ? "Removed" : "Logged",
    label,
  };
}
