import {
  DEFAULT_AGENDA_TIME_FRAME,
  type AgendaTimeFrame,
} from "@/types/scheduled-interaction";

export const AGENDA_VIEW_STORAGE_KEY = "kinsight-agenda-view";

export function loadAgendaViewPreference(): AgendaTimeFrame {
  if (typeof window === "undefined") return DEFAULT_AGENDA_TIME_FRAME;
  const saved = localStorage.getItem(AGENDA_VIEW_STORAGE_KEY);
  if (
    saved === "day" ||
    saved === "week" ||
    saved === "month" ||
    saved === "list"
  ) {
    return saved;
  }
  return DEFAULT_AGENDA_TIME_FRAME;
}

export function saveAgendaViewPreference(view: AgendaTimeFrame): void {
  localStorage.setItem(AGENDA_VIEW_STORAGE_KEY, view);
}
