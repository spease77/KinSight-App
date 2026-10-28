/**
 * OAuth scopes required for bi-directional calendar editing.
 * KinSight does not use NextAuth; Google and Outlook connect through
 * `/api/calendar/{provider}/connect` and store tokens in `calendar_connections`.
 */

/** Create, update, and delete events on the user's calendars. */
export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

/** Read calendar list + event details across every calendar, not just primary. */
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export const GOOGLE_CALENDAR_EMAIL_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email";

export const GOOGLE_CALENDAR_SCOPES_LIST = [
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_CALENDAR_EMAIL_SCOPE,
] as const;

export const GOOGLE_CALENDAR_SCOPES = GOOGLE_CALENDAR_SCOPES_LIST.join(" ");

/** Read and write the user's Outlook / Microsoft 365 calendars. */
export const OUTLOOK_CALENDARS_READWRITE_SCOPE = "Calendars.ReadWrite";

/** Required so Microsoft returns a refresh token. */
export const OUTLOOK_OFFLINE_ACCESS_SCOPE = "offline_access";

/** Account email / id for the connected mailbox. */
export const OUTLOOK_USER_READ_SCOPE = "User.Read";

export const OUTLOOK_CALENDAR_SCOPES_LIST = [
  OUTLOOK_CALENDARS_READWRITE_SCOPE,
  OUTLOOK_OFFLINE_ACCESS_SCOPE,
  OUTLOOK_USER_READ_SCOPE,
] as const;

export const OUTLOOK_CALENDAR_SCOPES = OUTLOOK_CALENDAR_SCOPES_LIST.join(" ");
