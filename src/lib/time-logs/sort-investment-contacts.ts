import type {
  InvestmentContactSummary,
  InvestmentSortField,
} from "@/types/time-log";

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareContacts(
  a: InvestmentContactSummary,
  b: InvestmentContactSummary,
  sortBy: InvestmentSortField
): number {
  if (sortBy === "time") {
    return a.totalMinutes - b.totalMinutes;
  }

  if (sortBy === "last_name") {
    return (
      compareText(a.lastName, b.lastName) ||
      compareText(a.firstName, b.firstName)
    );
  }

  return (
    compareText(a.firstName, b.firstName) ||
    compareText(a.lastName, b.lastName)
  );
}

export function sortInvestmentContacts(
  contacts: InvestmentContactSummary[],
  sortBy: InvestmentSortField,
  isDescending: boolean
): InvestmentContactSummary[] {
  const sorted = [...contacts].sort((a, b) =>
    compareContacts(a, b, sortBy)
  );

  return isDescending ? sorted.reverse() : sorted;
}

export function investmentSortDirectionLabel(
  sortBy: InvestmentSortField,
  isDescending: boolean
): string {
  if (sortBy === "time") {
    return isDescending ? "Most to least time" : "Least to most time";
  }

  return isDescending ? "Z to A" : "A to Z";
}
