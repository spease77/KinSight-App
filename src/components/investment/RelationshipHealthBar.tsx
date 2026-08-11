import {
  getRelationshipHealthManifest,
  RELATIONSHIP_HEALTH_SEGMENT_COUNT,
  type ContactMaintenanceStatus,
  type RelationshipHealthTier,
} from "@/lib/time-logs/maintenance";

interface RelationshipHealthBarProps {
  status: ContactMaintenanceStatus;
  isPlaceholder?: boolean;
}

const TIER_SEGMENT_CLASS: Record<RelationshipHealthTier, string> = {
  optimal: "relationship-health-segment--optimal",
  stable: "relationship-health-segment--stable",
  attention: "relationship-health-segment--attention",
  overdue: "relationship-health-segment--overdue",
  paused: "relationship-health-segment--paused",
  unknown: "relationship-health-segment--empty",
};

export function RelationshipHealthBar({
  status,
  isPlaceholder = false,
}: RelationshipHealthBarProps) {
  if (isPlaceholder) {
    const totalSegments = RELATIONSHIP_HEALTH_SEGMENT_COUNT;

    return (
      <div className="relationship-health-panel">
        <p className="relationship-health-caption" aria-hidden="true">
          <span className="relationship-health-caption-inner invisible">
            <span className="relationship-health-caption-label">
              Relationship Health
            </span>
            <span className="relationship-health-caption-separator">•</span>
            <span className="relationship-health-caption-status">Optimal</span>
          </span>
        </p>

        <div
          className="relationship-health-bar"
          role="meter"
          aria-label="Relationship health: no contact selected"
          aria-valuemin={0}
          aria-valuemax={totalSegments}
          aria-valuenow={0}
        >
          {Array.from({ length: totalSegments }, (_, index) => (
            <span
              key={index}
              className="relationship-health-segment relationship-health-segment--empty"
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    );
  }

  const manifest = getRelationshipHealthManifest(status);
  if (!manifest) return null;

  const { tier, label, filledSegments, totalSegments } = manifest;
  const filledClass = TIER_SEGMENT_CLASS[tier];

  return (
    <div className="relationship-health-panel">
      <p className="relationship-health-caption">
        <span className="relationship-health-caption-inner">
          <span className="relationship-health-caption-label">
            Relationship Health
          </span>
          <span className="relationship-health-caption-separator" aria-hidden="true">
            •
          </span>
          <span className="relationship-health-caption-status">{label}</span>
        </span>
      </p>

      <div
        className="relationship-health-bar"
        role="meter"
        aria-label={`Relationship health: ${label}`}
        aria-valuemin={0}
        aria-valuemax={totalSegments}
        aria-valuenow={filledSegments}
      >
        {Array.from({ length: totalSegments }, (_, index) => {
          const isFilled = index < filledSegments;
          const segmentClass = isFilled
            ? filledClass
            : tier === "overdue"
              ? "relationship-health-segment--depleted"
              : "relationship-health-segment--empty";

          return (
            <span
              key={index}
              className={`relationship-health-segment ${segmentClass}`}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}
