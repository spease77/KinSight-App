export type InvestmentSortField = "time" | "last_name" | "first_name";

export type MeetingFormat = "in_person" | "phone" | "video_call";

export const MEETING_FORMAT_OPTIONS: {
  value: MeetingFormat;
  label: string;
}[] = [
  { value: "in_person", label: "In-Person" },
  { value: "phone", label: "Phone" },
  { value: "video_call", label: "Video Call" },
];

export const DEFAULT_MEETING_FORMAT: MeetingFormat = "in_person";

export type DurationAdjustment = "add" | "subtract";

export const DURATION_ADJUSTMENT_OPTIONS: {
  value: DurationAdjustment;
  label: string;
}[] = [
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
];

export const DEFAULT_DURATION_ADJUSTMENT: DurationAdjustment = "add";

export type InvestmentContactSummary = {
  contactId: string;
  firstName: string;
  lastName: string;
  totalMinutes: number;
  lastLoggedAt: string | null;
};

export type InvestmentMilestone = {
  hours: number;
  label: string;
  tier: "Silver" | "Gold" | "Platinum";
  color: string;
};

export const INVESTMENT_GOAL_HOURS = 90;

export const INVESTMENT_MILESTONES: InvestmentMilestone[] = [
  { hours: 30, label: "30 hours", tier: "Silver", color: "#a8b4be" },
  { hours: 60, label: "60 hours", tier: "Gold", color: "#ffd966" },
  { hours: 90, label: "90 hours", tier: "Platinum", color: "#f0f6ff" },
];
