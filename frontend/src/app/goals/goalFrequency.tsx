"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ContributionFrequency = "weekly" | "biweekly" | "monthly" | "yearly";

/** Number of weeks in one contribution period for each frequency. */
const WEEKS_PER_PERIOD: Record<ContributionFrequency, number> = {
  weekly: 1,
  biweekly: 2,
  monthly: 52 / 12,
  yearly: 52,
};

export const FREQUENCY_OPTIONS: Array<{
  value: ContributionFrequency;
  label: string;
  short: string;
  suffix: string;
}> = [
  { value: "weekly", label: "Weekly", short: "Weekly", suffix: "/wk" },
  { value: "biweekly", label: "Bi-weekly", short: "Bi-weekly", suffix: "/2wk" },
  { value: "monthly", label: "Monthly", short: "Monthly", suffix: "/mo" },
  { value: "yearly", label: "Yearly", short: "Yearly", suffix: "/yr" },
];

/** Convert a canonical weekly amount into the given frequency's per-period amount. */
export function fromWeekly(weekly: number, freq: ContributionFrequency): number {
  return weekly * WEEKS_PER_PERIOD[freq];
}

/** Convert a per-period amount in the given frequency back to a canonical weekly amount. */
export function toWeekly(amount: number, freq: ContributionFrequency): number {
  return amount / WEEKS_PER_PERIOD[freq];
}

export function frequencySuffix(freq: ContributionFrequency): string {
  return FREQUENCY_OPTIONS.find((o) => o.value === freq)!.suffix;
}

export function frequencyLabel(freq: ContributionFrequency): string {
  return FREQUENCY_OPTIONS.find((o) => o.value === freq)!.label;
}

const STORAGE_KEY = "goals.contributionFrequency";

interface FrequencyContextValue {
  frequency: ContributionFrequency;
  setFrequency: (freq: ContributionFrequency) => void;
}

const FrequencyContext = createContext<FrequencyContextValue | null>(null);

export function GoalFrequencyProvider({ children }: { children: ReactNode }) {
  const [frequency, setFrequencyState] = useState<ContributionFrequency>("weekly");

  // Restore saved preference on mount (client only).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (
      saved === "weekly" ||
      saved === "biweekly" ||
      saved === "monthly" ||
      saved === "yearly"
    ) {
      setFrequencyState(saved);
    }
  }, []);

  function setFrequency(freq: ContributionFrequency) {
    setFrequencyState(freq);
    try {
      localStorage.setItem(STORAGE_KEY, freq);
    } catch {
      // ignore persistence errors (e.g. storage disabled)
    }
  }

  return (
    <FrequencyContext.Provider value={{ frequency, setFrequency }}>
      {children}
    </FrequencyContext.Provider>
  );
}

export function useContributionFrequency(): FrequencyContextValue {
  const ctx = useContext(FrequencyContext);
  if (!ctx) {
    throw new Error(
      "useContributionFrequency must be used within a GoalFrequencyProvider"
    );
  }
  return ctx;
}
