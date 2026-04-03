import {
  TimeToGoalResult,
  ContributionResult,
  FinalBalanceResult,
} from "../types";

interface CalculateTimeToGoalParams {
  principal: number;
  weeklyContribution: number;
  annualRate: number;
  target: number;
}

interface CalculateRequiredWeeklyContributionParams {
  principal: number;
  annualRate: number;
  target: number;
  years: number;
}

export function calculateTimeToGoal({
  principal,
  weeklyContribution,
  annualRate,
  target,
}: CalculateTimeToGoalParams): TimeToGoalResult | null {
  if (
    principal == null ||
    weeklyContribution == null ||
    target == null ||
    annualRate == null
  ) {
    return null;
  }

  const weeklyRate = annualRate / 100 / 52;
  let balance = principal;
  let weeks = 0;
  const chartData: Array<{ week: number; balance: number }> = [];

  while (balance < target) {
    chartData.push({ week: weeks, balance });
    balance += weeklyContribution;
    balance *= 1 + weeklyRate;
    weeks++;

    // safety cap (200 years)
    if (weeks > 52 * 200) return null;
  }

  chartData.push({ week: weeks, balance });

  const years = Math.floor(weeks / 52);
  const months = Math.round(((weeks % 52) / 52) * 12);

  return {
    weeks,
    years,
    months,
    finalBalance: balance,
    chartData,
  };
}

export function calculateRequiredWeeklyContribution({
  principal,
  annualRate,
  target,
  years,
}: CalculateRequiredWeeklyContributionParams): ContributionResult {
  const weeks = Math.round(years * 52);
  const weeklyRate = annualRate / 100 / 52;

  let low = 0;
  let high = target; // upper bound
  let contribution = 0;

  for (let i = 0; i < 50; i++) {
    contribution = (low + high) / 2;
    let balance = principal;

    for (let w = 0; w < weeks; w++) {
      balance += contribution;
      balance *= 1 + weeklyRate;
    }

    if (balance >= target) {
      high = contribution;
    } else {
      low = contribution;
    }
  }

  const chartData: Array<{ week: number; balance: number }> = [];
  let balance = principal;

  for (let w = 0; w <= weeks; w++) {
    chartData.push({ week: w, balance });
    balance += contribution;
    balance *= 1 + weeklyRate;
  }

  return {
    weeklyContribution: contribution,
    chartData,
  };
}

export function calculateFinalBalance({
  principal,
  weeklyContribution,
  annualRate,
  years,
}: {
  principal: number;
  weeklyContribution: number;
  annualRate: number;
  years: number;
}): FinalBalanceResult {
  const weeks = Math.round(years * 52);
  const weeklyRate = annualRate / 100 / 52;
  let balance = principal;
  const chartData: Array<{ week: number; balance: number }> = [];

  for (let w = 0; w <= weeks; w++) {
    chartData.push({ week: w, balance });
    balance += weeklyContribution;
    balance *= 1 + weeklyRate;
  }

  return {
    finalBalance: balance,
    chartData,
  };
}
