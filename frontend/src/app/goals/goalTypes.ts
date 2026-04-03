export type GoalType =
  | "emergency_fund"
  | "retirement"
  | "home_down_payment"
  | "education"
  | "debt_payoff"
  | "travel"
  | "vehicle"
  | "wedding"
  | "other";

export type TimelineType = "flexible" | "duration";

export interface Goal {
  id: string;
  type: GoalType;
  name: string;
  targetAmount: number;
  currentSavings: number;
  weeklyContribution: number;
  annualRate: number;
  timeline: TimelineType;
  durationYears?: number;
  createdAt: string;
  // type-specific fields
  emergencyMonths?: number;
  currentAge?: number;
  retirementAge?: number;
  desiredAnnualIncome?: number;
  homePrice?: number;
  debtInterestRate?: number;
}

export const GOAL_TYPE_OPTIONS: Array<{ value: GoalType; label: string; icon: string }> = [
  { value: "emergency_fund", label: "Emergency Fund", icon: "🛡️" },
  { value: "retirement", label: "Retirement", icon: "🏖️" },
  { value: "home_down_payment", label: "Home Down Payment", icon: "🏠" },
  { value: "education", label: "Education", icon: "🎓" },
  { value: "debt_payoff", label: "Debt Payoff", icon: "💳" },
  { value: "travel", label: "Travel", icon: "✈️" },
  { value: "vehicle", label: "Vehicle", icon: "🚗" },
  { value: "wedding", label: "Wedding", icon: "💍" },
  { value: "other", label: "Other", icon: "🎯" },
];

export const GOAL_TYPE_TIPS: Partial<Record<GoalType, string>> = {
  emergency_fund:
    "Emergency funds are typically sized at 3–6 months of expenses to cover unexpected costs.",
  retirement:
    "Experts recommend saving 10–12× your final annual income. Starting early dramatically reduces required contributions.",
  home_down_payment:
    "A 20% down payment avoids PMI and reduces your monthly mortgage payment significantly.",
  debt_payoff:
    "Pay off high-interest debt first. Even small extra payments can save thousands in interest over time.",
  education:
    "Consider tax-advantaged accounts like 529 plans for education savings.",
};
