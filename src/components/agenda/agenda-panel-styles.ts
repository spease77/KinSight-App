export {
  AGENDA_TIME_GUTTER_WIDTH,
  AGENDA_WEEK_DAYS_TRACK_WIDTH,
  AGENDA_WEEK_VIEWPORT_HEIGHT_PX,
  AGENDA_WEEK_VISIBLE_DAY_COUNT,
} from "@/lib/agenda/hourly-grid";

export const AGENDA_WEEK_HEADER_HEIGHT_PX = 36;

export const AGENDA_GRID_BORDER_HEADER = "border-agenda-grid-header";
export const AGENDA_GRID_BORDER_LINE = "border-agenda-grid-line";

export const AGENDA_PANEL_SHELL =
  "ui-card flex flex-col gap-2 overflow-hidden p-3";

/** Day panel stretches to fill remaining viewport height. */
export const AGENDA_DAY_PANEL_SHELL =
  "ui-card flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3";

/** Day/week/month views — no card frame so the grid uses page margins. */
export const AGENDA_TIMELINE_PANEL_SHELL =
  "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden";

/** Month calendar — same borderless shell as day/week timeline views. */
export const AGENDA_MONTH_PANEL_SHELL = AGENDA_TIMELINE_PANEL_SHELL;

export const AGENDA_TIMELINE_DAY_PANEL_SHELL =
  "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden";

export const AGENDA_PANEL_TITLE =
  "min-w-0 truncate font-mono text-xs font-medium uppercase tracking-[0.08em] text-foreground";

/** Shared calendar content frame — same bounding box for Day, Week, and Month. */
export const AGENDA_CALENDAR_FRAME =
  "agenda-calendar-frame flex min-h-0 flex-1 flex-col overflow-hidden";

/** Timeline grid wrapper without the card-style frame (day/week views). */
export const AGENDA_TIMELINE_FRAME =
  "agenda-timeline-frame flex min-h-0 flex-1 flex-col overflow-hidden";

export const AGENDA_DAY_TIME_SCROLL =
  "agenda-day-time-scroll vertical-time-container contacts-scroll min-h-0 h-full w-full flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]";

export const AGENDA_MONTH_GRID =
  "agenda-month-grid min-h-0 flex-1";

export const AGENDA_MONTH_SCROLL =
  "agenda-month-scroll vertical-time-container contacts-scroll min-h-0 h-full w-full flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]";

/** Week grid sits directly in the shell — no nested inner card. */
export const AGENDA_WEEK_GRID_FRAME = AGENDA_TIMELINE_FRAME;
export const AGENDA_WEEK_HEADER_BAND = "agenda-week-header-band flex shrink-0";
export const AGENDA_WEEK_TIME_SCROLL =
  "agenda-week-time-scroll vertical-time-container contacts-scroll min-h-0 h-full min-w-0 w-full flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]";
export const AGENDA_WEEK_DAY_HEADER =
  "agenda-week-day-header sticky top-0 z-10 shrink-0 border-b bg-main text-center font-mono text-[10px] font-semibold tracking-wide transition-colors";

/** Shared hour labels in day/week timeline grids (styled in globals.css). */
export const AGENDA_TIME_LABEL = "agenda-week-time-slot";

export const AGENDA_MONTH_WEEKDAY =
  "py-2 text-center font-mono text-xs font-semibold uppercase tracking-wide text-muted";

export const AGENDA_PANEL_NAV_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-lg text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground";

/** Month view — sticky row with visible month label (left) and prev/next arrows (right). */
export const AGENDA_MONTH_NAV_HEADER =
  "agenda-month-nav-header flex shrink-0 items-center justify-between gap-2 bg-main";

export const AGENDA_MONTH_NAV_LABEL =
  "agenda-month-nav-label min-w-0 flex-1 truncate";

/** Inset ring stays inside the card so parent overflow does not clip selection. */
export const AGENDA_ITEM_SELECTED_CLASS =
  "ring-2 ring-inset ring-accent-green-bright";
