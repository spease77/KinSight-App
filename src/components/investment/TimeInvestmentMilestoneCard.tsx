"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { Contact } from "@/types/contact";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";
import { parseContactNameParts } from "@/lib/contacts/parse-contact-name";
import {
  formatDurationMinutes,
  formatRemainingMinutes,
} from "@/lib/time-logs/format-duration";
import {
  getContactMaintenanceStatus,
  maintenanceBadgeLabel,
  type ContactMaintenanceStatus,
} from "@/lib/time-logs/maintenance";
import {
  INVESTMENT_MILESTONES,
  isMilestoneReached,
  milestoneProgress,
  milestoneRailFillPercent,
  minutesUntilMilestone,
  nextMilestoneGoalHours,
} from "@/lib/time-logs/milestones";
import { INVESTMENT_GOAL_HOURS } from "@/types/time-log";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";
import { RelationshipHealthBar } from "@/components/investment/RelationshipHealthBar";

const RING_SIZE_DESKTOP = 220;
const RING_SIZE_MOBILE = 148;
const RING_STROKE_DESKTOP = 18;

function useProgressRingSize() {
  const [size, setSize] = useState(RING_SIZE_MOBILE);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setSize(mediaQuery.matches ? RING_SIZE_DESKTOP : RING_SIZE_MOBILE);
    };

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return size;
}

interface ProgressRingProps {
  goalContact: Contact | null;
  totalMinutes: number;
  maintenanceStatus: ContactMaintenanceStatus | null;
  isLoading: boolean;
  ringSize: number;
  hasGoalContact: boolean;
}

const EMPTY_MAINTENANCE_STATUS: ContactMaintenanceStatus = {
  daysSinceLastLog: Number.POSITIVE_INFINITY,
  daysRemaining: -1,
  daysLeft: 0,
  isOverdue: false,
  isPaused: false,
};

function MaintenanceBadge({
  status,
  isPlaceholder = false,
}: {
  status: ContactMaintenanceStatus;
  isPlaceholder?: boolean;
}) {
  if (isPlaceholder) {
    return (
      <span className="maintenance-badge--active inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
        ● Active
      </span>
    );
  }

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        status.isPaused
          ? "border border-border/70 bg-card-hover text-muted"
          : status.isOverdue
            ? "border border-accent-orange-bright/70 bg-accent-orange-muted text-accent-orange-bright"
            : "maintenance-badge--active"
      }`}
    >
      {maintenanceBadgeLabel(status)}
    </span>
  );
}

function ProgressRing({
  goalContact,
  totalMinutes,
  maintenanceStatus,
  isLoading,
  ringSize,
  hasGoalContact,
}: ProgressRingProps) {
  const ringStroke = Math.round(
    RING_STROKE_DESKTOP * (ringSize / RING_SIZE_DESKTOP)
  );
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progress = hasGoalContact ? milestoneProgress(totalMinutes) : 0;
  const dashOffset = ringCircumference * (1 - progress);
  const center = ringSize / 2;
  const displayMaintenanceStatus = maintenanceStatus ?? EMPTY_MAINTENANCE_STATUS;

  const contactFirstName = goalContact
    ? parseContactNameParts(goalContact.name).firstName ||
      goalContact.name.trim().split(/\s+/)[0] ||
      goalContact.name
    : "";

  return (
    <div
      className="progress-tracker-column"
      style={{ width: ringSize, maxWidth: "100%" }}
    >
      <div
        className={`rapport-goal-ghost-target ${
          hasGoalContact
            ? "rapport-goal-ghost-target--active"
            : "rapport-goal-ghost-target--inactive"
        }`}
      >
        <div
          className="relative shrink-0"
          style={{ width: ringSize, height: ringSize }}
          role="img"
          aria-label={
            hasGoalContact
              ? `${formatDurationMinutes(totalMinutes)} logged with ${contactFirstName} of ${INVESTMENT_GOAL_HOURS} hour goal${
                  maintenanceStatus
                    ? maintenanceStatus.isPaused
                      ? ", reminders paused"
                      : maintenanceStatus.isOverdue
                        ? ", maintenance overdue"
                        : `, ${maintenanceStatus.daysLeft} maintenance days remaining`
                    : ""
                }`
              : "Select a contact to view rapport goal progress"
          }
        >
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={center}
              cy={center}
              r={ringRadius}
              fill="none"
              stroke="var(--bg-card-hover)"
              strokeWidth={ringStroke}
            />
            <circle
              cx={center}
              cy={center}
              r={ringRadius}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={dashOffset}
              className="progress-ring-arc transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center px-4">
            {!hasGoalContact ? (
              <p className="w-full text-center font-sans text-[1.65rem] font-bold leading-none tracking-tight text-muted sm:text-[2.35rem] md:text-[2.65rem]">
                --h --m
              </p>
            ) : isLoading ? (
              <span className="type-meta">Loading…</span>
            ) : (
              <p className="w-full text-center font-sans text-[1.65rem] font-bold leading-none tracking-tight text-foreground sm:text-[2.35rem] md:text-[2.65rem]">
                {formatDurationMinutes(totalMinutes)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className="progress-ring-indicators"
        aria-label="Relationship maintenance status"
      >
        <MaintenanceBadge
          status={displayMaintenanceStatus}
          isPlaceholder={!hasGoalContact}
        />
        <div
          className={`rapport-goal-ghost-target ${
            hasGoalContact
              ? "rapport-goal-ghost-target--active"
              : "rapport-goal-ghost-target--inactive"
          }`}
        >
          <RelationshipHealthBar
            status={displayMaintenanceStatus}
            isPlaceholder={!hasGoalContact}
          />
        </div>
      </div>
    </div>
  );
}

interface TimeInvestmentMilestoneCardProps {
  selectedContact: Contact | null;
  refreshToken?: number;
}

/** Ladder reads top → bottom: Platinum, Gold, Silver. */
const MILESTONE_LADDER_ORDER = [...INVESTMENT_MILESTONES].reverse();

interface MilestoneLadderProps {
  totalMinutes: number;
  maintenanceOverdue: boolean;
  maintenancePaused: boolean;
  hasGoalContact: boolean;
}

const TIER_KEY: Record<
  (typeof INVESTMENT_MILESTONES)[number]["tier"],
  "silver" | "gold" | "platinum"
> = {
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
};

function MilestoneCircle({
  tier,
  reached,
  maintenanceOverdue,
  maintenancePaused,
  forcePending = false,
}: {
  tier: (typeof INVESTMENT_MILESTONES)[number]["tier"];
  reached: boolean;
  maintenanceOverdue: boolean;
  maintenancePaused: boolean;
  forcePending?: boolean;
}) {
  const tierKey = TIER_KEY[tier];
  const isReached = reached && !forcePending;

  const haloClass =
    isReached && !maintenancePaused
      ? maintenanceOverdue
        ? "milestone-halo--overdue"
        : "milestone-halo--active"
      : "";

  return (
    <div
      className={`milestone-circle milestone-circle--${tierKey} ${
        isReached ? "milestone-circle--reached" : "milestone-circle--pending"
      } ${haloClass}`}
    >
      {isReached ? (
        <Check
          className="milestone-circle-icon"
          strokeWidth={3}
          aria-hidden="true"
        />
      ) : (
        <span
          className={`milestone-circle-dot milestone-circle-dot--${tierKey}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function MilestoneLadder({
  totalMinutes,
  maintenanceOverdue,
  maintenancePaused,
  hasGoalContact,
}: MilestoneLadderProps) {
  const milestones = MILESTONE_LADDER_ORDER;
  const fillPercent = hasGoalContact ? milestoneRailFillPercent(totalMinutes) : 0;

  return (
    <div
      className={`milestone-ladder rapport-goal-ghost-target h-full ${
        hasGoalContact
          ? "rapport-goal-ghost-target--active"
          : "rapport-goal-ghost-target--inactive"
      }`}
      aria-label="Rapport milestones"
      aria-disabled={!hasGoalContact}
    >
      <div className="milestone-ladder-layout">
        <div className="milestone-ladder-rail-column">
          <div className="milestone-ladder-track-rail" aria-hidden="true">
            <div className="milestone-ladder-track h-full w-full rounded-full" />
            <div
              className="milestone-track-fill absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-700 ease-out"
              style={{ height: `${fillPercent}%` }}
            />
          </div>

          <div className="milestone-ladder-nodes">
            {milestones.map((milestone) => {
              const reached =
                hasGoalContact &&
                isMilestoneReached(totalMinutes, milestone.hours);

              return (
                <div key={milestone.hours} className="milestone-ladder-node">
                  <MilestoneCircle
                    tier={milestone.tier}
                    reached={reached}
                    maintenanceOverdue={maintenanceOverdue}
                    maintenancePaused={maintenancePaused}
                    forcePending={!hasGoalContact}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="milestone-ladder-labels">
          {milestones.map((milestone, index) => {
            const reached =
              hasGoalContact &&
              isMilestoneReached(totalMinutes, milestone.hours);
            const remaining = minutesUntilMilestone(
              totalMinutes,
              milestone.hours
            );
            const isLast = index === milestones.length - 1;
            const isFirst = index === 0;

            return (
              <div
                key={milestone.hours}
                className={`milestone-ladder-label ${
                  isFirst
                    ? "milestone-ladder-label--top"
                    : isLast
                      ? "milestone-ladder-label--bottom"
                      : "milestone-ladder-label--middle"
                }`}
              >
                <div
                  className={`milestone-text milestone-text--${TIER_KEY[milestone.tier]}`}
                >
                  <p className="text-xs font-semibold tracking-tight sm:text-sm">
                    {milestone.tier}
                    <span className="font-normal"> · {milestone.label}</span>
                  </p>
                  {reached ? (
                    <p className="mt-0.5 text-[10px] sm:text-xs">
                      {maintenanceOverdue
                        ? "Unlocked · Needs touch base"
                        : "Unlocked"}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] sm:text-xs">
                      {hasGoalContact
                        ? formatRemainingMinutes(remaining)
                        : "--h"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const TimeInvestmentMilestoneCard = forwardRef<
  HTMLElement,
  TimeInvestmentMilestoneCardProps
>(function TimeInvestmentMilestoneCard(
  { selectedContact = null, refreshToken = 0 },
  ref
) {
  const ringSize = useProgressRingSize();
  const { contacts: timeSummaries, isLoading, error } =
    useInvestmentSummary(refreshToken);

  const goalContact = selectedContact;

  const selectedSummary = useMemo(() => {
    if (!goalContact) return null;
    return (
      timeSummaries.find((item) => item.contactId === goalContact.id) ?? null
    );
  }, [goalContact, timeSummaries]);

  const contactMinutes = selectedSummary?.totalMinutes ?? 0;

  const maintenanceStatus = useMemo(() => {
    if (!goalContact) return null;
    return getContactMaintenanceStatus(selectedSummary?.lastLoggedAt ?? null, {
      isTrackingPaused: goalContact.isTrackingPaused ?? false,
    });
  }, [goalContact, selectedSummary?.lastLoggedAt]);

  const heading = goalContact
    ? formatContactDisplayName(goalContact.name, "first")
    : "Select a Contact";
  const hasGoalContact = goalContact != null;
  const nextGoalHours = nextMilestoneGoalHours(contactMinutes);
  const maintenanceOverdue =
    !maintenanceStatus?.isPaused && (maintenanceStatus?.isOverdue ?? false);
  const maintenancePaused = maintenanceStatus?.isPaused ?? false;

  return (
    <section
      ref={ref}
      aria-label={
        hasGoalContact ? `Rapport Goal for ${heading}` : "Rapport Goal"
      }
      className="ui-card flex scroll-mt-24 flex-col gap-4 p-4 sm:gap-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-section-title min-w-0 truncate font-sans text-[1.09375rem] tracking-tight text-foreground">
          {hasGoalContact ? heading : "Select a Contact"}
        </h2>
        <p className="type-meta shrink-0">
          Next Goal: {hasGoalContact ? `${nextGoalHours}h` : "--h"}
        </p>
      </div>

      {error ? (
        <p className="text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-6 md:gap-8">
          <div className="flex h-full min-w-0 justify-center">
            <ProgressRing
              goalContact={goalContact}
              totalMinutes={contactMinutes}
              maintenanceStatus={maintenanceStatus}
              isLoading={isLoading && hasGoalContact}
              ringSize={ringSize}
              hasGoalContact={hasGoalContact}
            />
          </div>
          <div className="flex h-full min-w-0 flex-col">
            <MilestoneLadder
              totalMinutes={contactMinutes}
              maintenanceOverdue={maintenanceOverdue}
              maintenancePaused={maintenancePaused}
              hasGoalContact={hasGoalContact}
            />
          </div>
        </div>
      )}
    </section>
  );
});
