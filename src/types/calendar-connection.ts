export const CALENDAR_PROVIDERS = ["google", "outlook"] as const;

export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

export type CalendarConnectionStatus = {
  provider: CalendarProvider;
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  setupRequired?: boolean;
};

export type CalendarStatusResponse = {
  signedIn: boolean;
  google: CalendarConnectionStatus;
  outlook: CalendarConnectionStatus;
};
