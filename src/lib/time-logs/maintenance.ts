export const MAINTENANCE_WINDOW_DAYS = 45;
export const MAINTENANCE_REMINDER_THRESHOLDS = [14, 5] as const;
export type MaintenanceReminderThreshold =
  (typeof MAINTENANCE_REMINDER_THRESHOLDS)[number];

export type ContactMaintenanceStatus = {
  daysSinceLastLog: number;
  daysRemaining: number;
  daysLeft: number;
  isOverdue: boolean;
  isPaused: boolean;
};

export function daysSinceLastLog(
  lastLoggedAt: string | null | undefined,
  referenceDate = new Date()
): number {
  if (!lastLoggedAt) return Number.POSITIVE_INFINITY;

  const last = new Date(lastLoggedAt);
  if (Number.isNaN(last.getTime())) return Number.POSITIVE_INFINITY;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const lastDay = new Date(last);
  lastDay.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - lastDay.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function daysRemaining(
  lastLoggedAt: string | null | undefined,
  referenceDate = new Date()
): number {
  const elapsed = daysSinceLastLog(lastLoggedAt, referenceDate);
  if (!Number.isFinite(elapsed)) return -1;
  return MAINTENANCE_WINDOW_DAYS - elapsed;
}

export function isMaintenanceReminderDue(
  daysRemainingValue: number
): daysRemainingValue is MaintenanceReminderThreshold {
  return (MAINTENANCE_REMINDER_THRESHOLDS as readonly number[]).includes(
    daysRemainingValue
  );
}

export function getContactMaintenanceStatus(
  lastLoggedAt: string | null | undefined,
  options?: {
    referenceDate?: Date;
    isTrackingPaused?: boolean;
  }
): ContactMaintenanceStatus {
  const referenceDate = options?.referenceDate ?? new Date();
  const isPaused = options?.isTrackingPaused ?? false;
  const daysSinceLastLogValue = daysSinceLastLog(lastLoggedAt, referenceDate);
  const daysRemainingValue = daysRemaining(lastLoggedAt, referenceDate);
  const isOverdue = daysSinceLastLogValue > MAINTENANCE_WINDOW_DAYS;
  const daysLeft = isOverdue
    ? 0
    : Math.max(0, MAINTENANCE_WINDOW_DAYS - daysSinceLastLogValue);

  return {
    daysSinceLastLog: daysSinceLastLogValue,
    daysRemaining: daysRemainingValue,
    daysLeft,
    isOverdue,
    isPaused,
  };
}

export function maintenanceBadgeLabel(status: ContactMaintenanceStatus): string {
  if (status.isPaused) {
    return "⏸ Reminders Paused";
  }

  if (status.isOverdue) {
    return "▲ Overdue (Touch Base)";
  }

  return `● Active (${status.daysLeft} days left)`;
}

export const RELATIONSHIP_HEALTH_SEGMENT_COUNT = 9;

export type RelationshipHealthTier =
  | "optimal"
  | "stable"
  | "attention"
  | "overdue"
  | "paused"
  | "unknown";

export type RelationshipHealthManifest = {
  tier: RelationshipHealthTier;
  label: string;
  filledSegments: number;
  totalSegments: number;
};

export function getRelationshipHealthTier(
  status: ContactMaintenanceStatus
): RelationshipHealthTier {
  if (status.isPaused) return "paused";
  if (!Number.isFinite(status.daysSinceLastLog)) return "unknown";
  if (status.isOverdue || status.daysRemaining <= 0) return "overdue";
  if (status.daysRemaining >= 30) return "optimal";
  if (status.daysRemaining >= 15) return "stable";
  if (status.daysRemaining >= 1) return "attention";
  return "overdue";
}

export function relationshipHealthLabel(tier: RelationshipHealthTier): string {
  switch (tier) {
    case "optimal":
      return "Optimal";
    case "stable":
      return "Stable";
    case "attention":
      return "Attention Required";
    case "overdue":
      return "Overdue";
    case "paused":
      return "Paused";
    default:
      return "Unknown";
  }
}

export function getRelationshipHealthManifest(
  status: ContactMaintenanceStatus | null
): RelationshipHealthManifest | null {
  if (!status) return null;

  const tier = getRelationshipHealthTier(status);
  const totalSegments = RELATIONSHIP_HEALTH_SEGMENT_COUNT;

  if (tier === "unknown") {
    return {
      tier,
      label: relationshipHealthLabel(tier),
      filledSegments: 0,
      totalSegments,
    };
  }

  if (tier === "paused") {
    const frozenFill = Number.isFinite(status.daysSinceLastLog)
      ? Math.max(
          0,
          Math.min(
            totalSegments,
            Math.ceil(status.daysLeft / (MAINTENANCE_WINDOW_DAYS / totalSegments))
          )
        )
      : 0;

    return {
      tier,
      label: relationshipHealthLabel(tier),
      filledSegments: frozenFill,
      totalSegments,
    };
  }

  if (tier === "overdue") {
    return {
      tier,
      label: relationshipHealthLabel(tier),
      filledSegments: 0,
      totalSegments,
    };
  }

  const filledSegments = Math.max(
    1,
    Math.min(
      totalSegments,
      Math.ceil(
        status.daysLeft / (MAINTENANCE_WINDOW_DAYS / totalSegments)
      )
    )
  );

  return {
    tier,
    label: relationshipHealthLabel(tier),
    filledSegments,
    totalSegments,
  };
}
