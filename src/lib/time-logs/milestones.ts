import {
  INVESTMENT_GOAL_HOURS,
  INVESTMENT_MILESTONES,
} from "@/types/time-log";

export function investmentGoalMinutes(): number {
  return INVESTMENT_GOAL_HOURS * 60;
}

export function milestoneProgress(totalMinutes: number): number {
  const goal = investmentGoalMinutes();
  if (goal <= 0) return 0;
  return Math.min(Math.max(totalMinutes, 0) / goal, 1);
}

export function isMilestoneReached(
  totalMinutes: number,
  milestoneHours: number
): boolean {
  return totalMinutes >= milestoneHours * 60;
}

export function minutesUntilMilestone(
  totalMinutes: number,
  milestoneHours: number
): number {
  return Math.max(0, milestoneHours * 60 - totalMinutes);
}

export function nextMilestoneGoalHours(totalMinutes: number): number {
  if (!isMilestoneReached(totalMinutes, 30)) return 30;
  if (!isMilestoneReached(totalMinutes, 60)) return 60;
  return 90;
}

export function milestoneRailFillPercent(totalMinutes: number): number {
  const tiers = INVESTMENT_MILESTONES.map((milestone) => milestone.hours);
  const segment = 100 / tiers.length;

  for (let index = 0; index < tiers.length; index += 1) {
    const tierMinutes = tiers[index] * 60;
    const previousMinutes = index === 0 ? 0 : tiers[index - 1] * 60;

    if (totalMinutes < tierMinutes) {
      const segmentSpan = tierMinutes - previousMinutes;
      const segmentProgress =
        segmentSpan > 0 ? (totalMinutes - previousMinutes) / segmentSpan : 0;
      return segment * index + segmentProgress * segment;
    }
  }

  return 100;
}

export { INVESTMENT_MILESTONES };
