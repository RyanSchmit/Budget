"use client";

import { useEffect, useState } from "react";
import MoneyInput from "@/app/MoneyInput";
import { useAppSelector } from "@/lib/store/hooks";
import { Goal, GoalType, GOAL_TYPE_OPTIONS, GOAL_TYPE_TIPS, TimelineType } from "./goalTypes";
import { formatMoney } from "@/app/format";

interface GoalFormProps {
  initial?: Goal;
  onSave: (goal: Goal) => void;
  onCancel: () => void;
}

function generateId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function GoalForm({ initial, onSave, onCancel }: GoalFormProps) {
  const transactions = useAppSelector((s) => s.transactions.transactions);

  // Derive spending stats from transactions
  const spendingSuggestion = (() => {
    if (transactions.length === 0) return null;
    const income = transactions
      .filter((t) => t.category === "Income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = transactions
      .filter((t) => t.category !== "Income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    // Estimate months of data from date range
    const dates = transactions.map((t) => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const months = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));
    const monthlyIncome = income / months;
    const monthlyExpenses = expenses / months;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const weeklySavings = monthlySavings > 0 ? monthlySavings / 4.33 : null;
    return { monthlySavings, weeklySavings, monthlyExpenses };
  })();

  const avgMonthlyExpenses = spendingSuggestion?.monthlyExpenses ?? 0;

  // Form state
  const [type, setType] = useState<GoalType>(initial?.type ?? "emergency_fund");
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState<number | null>(initial?.targetAmount ?? null);
  const [currentSavings, setCurrentSavings] = useState<number | null>(initial?.currentSavings ?? 0);
  const [weeklyContribution, setWeeklyContribution] = useState<number | null>(
    initial?.weeklyContribution ?? (spendingSuggestion?.weeklySavings ? Math.round(spendingSuggestion.weeklySavings) : null)
  );
  const [annualRate, setAnnualRate] = useState<number | string>(initial?.annualRate ?? 5);
  const [timeline, setTimeline] = useState<TimelineType>(initial?.timeline ?? "flexible");
  const [durationYears, setDurationYears] = useState<string>(initial?.durationYears?.toString() ?? "");

  // Type-specific fields
  const [emergencyMonths, setEmergencyMonths] = useState<string>(initial?.emergencyMonths?.toString() ?? "3");
  const [currentAge, setCurrentAge] = useState<string>(initial?.currentAge?.toString() ?? "");
  const [retirementAge, setRetirementAge] = useState<string>(initial?.retirementAge?.toString() ?? "65");
  const [desiredAnnualIncome, setDesiredAnnualIncome] = useState<number | null>(initial?.desiredAnnualIncome ?? null);
  const [homePrice, setHomePrice] = useState<number | null>(initial?.homePrice ?? null);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(20);
  const [debtBalance, setDebtBalance] = useState<number | null>(
    initial?.type === "debt_payoff" ? (initial.targetAmount ?? null) : null
  );
  const [debtInterestRate, setDebtInterestRate] = useState<string>(initial?.debtInterestRate?.toString() ?? "");

  // Auto-compute target for smart types
  useEffect(() => {
    if (type === "emergency_fund" && avgMonthlyExpenses > 0) {
      const months = parseFloat(emergencyMonths) || 3;
      setTargetAmount(Math.round(avgMonthlyExpenses * months));
    }
  }, [type, emergencyMonths, avgMonthlyExpenses]);

  useEffect(() => {
    if (type === "retirement") {
      const age = parseFloat(currentAge);
      const retAge = parseFloat(retirementAge);
      const income = desiredAnnualIncome ?? 0;
      if (!isNaN(age) && !isNaN(retAge) && income > 0) {
        // Target = 25× desired annual income (4% rule)
        setTargetAmount(Math.round(income * 25));
      }
    }
  }, [type, currentAge, retirementAge, desiredAnnualIncome]);

  useEffect(() => {
    if (type === "home_down_payment" && homePrice && homePrice > 0) {
      setTargetAmount(Math.round(homePrice * (downPaymentPct / 100)));
    }
  }, [type, homePrice, downPaymentPct]);

  useEffect(() => {
    if (type === "debt_payoff" && debtBalance && debtBalance > 0) {
      setTargetAmount(Math.round(debtBalance));
    }
  }, [type, debtBalance]);

  // Pre-fill weekly contribution suggestion when switching type
  useEffect(() => {
    if (!initial && spendingSuggestion?.weeklySavings != null && weeklyContribution === null) {
      setWeeklyContribution(Math.round(spendingSuggestion.weeklySavings));
    }
  }, [spendingSuggestion, initial, weeklyContribution]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetAmount || targetAmount <= 0) return;

    const goal: Goal = {
      id: initial?.id ?? generateId(),
      type,
      name: name.trim() || GOAL_TYPE_OPTIONS.find((o) => o.value === type)!.label,
      targetAmount,
      currentSavings: currentSavings ?? 0,
      weeklyContribution: weeklyContribution ?? 0,
      annualRate: Number(annualRate) || 0,
      timeline,
      durationYears: timeline === "duration" ? parseFloat(durationYears) || undefined : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      emergencyMonths: type === "emergency_fund" ? parseFloat(emergencyMonths) : undefined,
      currentAge: type === "retirement" ? parseFloat(currentAge) : undefined,
      retirementAge: type === "retirement" ? parseFloat(retirementAge) : undefined,
      desiredAnnualIncome: type === "retirement" ? (desiredAnnualIncome ?? undefined) : undefined,
      homePrice: type === "home_down_payment" ? (homePrice ?? undefined) : undefined,
      debtInterestRate: type === "debt_payoff" ? parseFloat(debtInterestRate) : undefined,
    };

    onSave(goal);
  }

  const tip = GOAL_TYPE_TIPS[type];
  const selectedOption = GOAL_TYPE_OPTIONS.find((o) => o.value === type);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Goal type & name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Goal type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as GoalType);
              setTargetAmount(null);
            }}
            className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
          >
            {GOAL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.icon} {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Goal name{" "}
            <span className="text-gray-500">(optional)</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selectedOption?.label ?? ""}
            className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white placeholder-gray-600"
          />
        </div>
      </div>

      {/* Type-specific inputs */}
      {type === "emergency_fund" && (
        <div className="rounded-lg border border-gray-700 bg-gray-950/50 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Emergency Fund Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Months of expenses</label>
              <input
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={emergencyMonths}
                onChange={(e) => setEmergencyMonths(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Target amount</label>
              <div className="h-10 flex items-center px-3 rounded-md border border-gray-600 bg-gray-800 text-gray-300 text-sm">
                {targetAmount ? formatMoney(targetAmount) : avgMonthlyExpenses > 0 ? "Enter months above" : "No transaction data"}
              </div>
            </div>
          </div>
          {avgMonthlyExpenses > 0 && (
            <p className="text-xs text-gray-500">
              Based on your avg. monthly expenses of {formatMoney(avgMonthlyExpenses)}
            </p>
          )}
        </div>
      )}

      {type === "retirement" && (
        <div className="rounded-lg border border-gray-700 bg-gray-950/50 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Retirement Details</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Current age</label>
              <input
                type="number"
                min="18"
                max="80"
                value={currentAge}
                onChange={(e) => setCurrentAge(e.target.value)}
                placeholder="30"
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Retire at age</label>
              <input
                type="number"
                min="40"
                max="90"
                value={retirementAge}
                onChange={(e) => setRetirementAge(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Years to save</label>
              <div className="h-10 flex items-center px-3 rounded-md border border-gray-600 bg-gray-800 text-gray-300 text-sm">
                {currentAge && retirementAge
                  ? `${Math.max(0, parseFloat(retirementAge) - parseFloat(currentAge))} yrs`
                  : "—"}
              </div>
            </div>
          </div>
          <MoneyInput
            label="Desired annual income in retirement"
            value={desiredAnnualIncome}
            onChange={setDesiredAnnualIncome}
          />
          {targetAmount && targetAmount > 0 && (
            <p className="text-xs text-gray-500">
              Target: {formatMoney(targetAmount)} (25× annual income using the 4% rule)
            </p>
          )}
        </div>
      )}

      {type === "home_down_payment" && (
        <div className="rounded-lg border border-gray-700 bg-gray-950/50 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Home Details</p>
          <MoneyInput label="Home price" value={homePrice} onChange={setHomePrice} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Down payment %</label>
              <input
                type="number"
                min="3"
                max="100"
                step="1"
                value={downPaymentPct}
                onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Down payment target</label>
              <div className="h-10 flex items-center px-3 rounded-md border border-gray-600 bg-gray-800 text-gray-300 text-sm">
                {targetAmount ? formatMoney(targetAmount) : "Enter home price above"}
              </div>
            </div>
          </div>
        </div>
      )}

      {type === "debt_payoff" && (
        <div className="rounded-lg border border-gray-700 bg-gray-950/50 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Debt Details</p>
          <div className="grid grid-cols-2 gap-4">
            <MoneyInput label="Current debt balance" value={debtBalance} onChange={setDebtBalance} />
            <div>
              <label className="mb-1 block text-sm text-gray-300">Interest rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={debtInterestRate}
                onChange={(e) => setDebtInterestRate(e.target.value)}
                placeholder="e.g. 19.99"
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Generic target for other goal types */}
      {!["emergency_fund", "retirement", "home_down_payment", "debt_payoff"].includes(type) && (
        <MoneyInput label="Target amount" value={targetAmount} onChange={setTargetAmount} />
      )}

      {/* Current savings & contribution */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MoneyInput label="Current savings toward this goal" value={currentSavings} onChange={setCurrentSavings} />

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Weekly contribution
            {spendingSuggestion?.weeklySavings != null && (
              <button
                type="button"
                onClick={() => setWeeklyContribution(Math.round(spendingSuggestion.weeklySavings!))}
                className="ml-2 text-xs text-green-400 hover:text-green-300 underline"
              >
                use suggested {formatMoney(Math.round(spendingSuggestion.weeklySavings))}/wk
              </button>
            )}
          </label>
          <MoneyInput value={weeklyContribution} onChange={setWeeklyContribution} />
        </div>
      </div>

      {spendingSuggestion?.weeklySavings != null && (
        <div className="rounded-md border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-300">
          Based on your transactions, you save approximately{" "}
          <strong>{formatMoney(Math.round(spendingSuggestion.monthlySavings))}/month</strong> —
          that&apos;s{" "}
          <strong>{formatMoney(Math.round(spendingSuggestion.weeklySavings))}/week</strong> you
          could direct toward this goal.
        </div>
      )}

      {/* Timeline & rate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Timeline</label>
          <select
            value={timeline}
            onChange={(e) => setTimeline(e.target.value as TimelineType)}
            className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
          >
            <option value="flexible">Flexible (calculate time)</option>
            <option value="duration">Fixed duration</option>
          </select>
        </div>

        {timeline === "duration" && (
          <div>
            <label className="mb-1 block text-sm text-gray-300">Duration (years)</label>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={durationYears}
              onChange={(e) => setDurationYears(e.target.value)}
              placeholder="e.g. 5"
              className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-gray-300">Expected annual return (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="30"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white"
          />
        </div>
      </div>

      {tip && (
        <p className="text-xs text-gray-400 border-l-2 border-gray-600 pl-3">{tip}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="flex-1 rounded-md bg-green-600 py-2.5 font-medium transition hover:bg-green-500"
        >
          {initial ? "Save Changes" : "Add Goal"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-700 px-5 py-2.5 text-gray-300 transition hover:bg-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
