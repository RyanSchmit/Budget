export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface NetWorthHistoryItem {
  date: string;
  value: number;
}

export interface AccountItem {
  id: number;
  name: string;
  amount: number | null;
}

export interface ChartDataPoint {
  week: number;
  balance: number;
}

export interface TimeToGoalResult {
  weeks: number;
  years: number;
  months: number;
  finalBalance: number;
  chartData: ChartDataPoint[];
}

export interface ContributionResult {
  weeklyContribution: number;
  chartData: ChartDataPoint[];
}

export interface FinalBalanceResult {
  finalBalance: number;
  chartData: ChartDataPoint[];
}

export type CalculationResult =
  | TimeToGoalResult
  | ContributionResult
  | FinalBalanceResult;
