"use client";

import { useState } from "react";
import Navbar from "@/app/Navbar";
import MoneyInput from "@/app/MoneyInput";
import { formatMoney } from "@/app/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  calculateTimeToGoal,
  calculateRequiredWeeklyContribution,
  calculateFinalBalance,
} from "@/app/goals/goalCalculate";
import {
  TimeToGoalResult,
  ContributionResult,
  FinalBalanceResult,
} from "@/app/types";

const MODES = {
  TIME_TO_GOAL: "time",
  CONTRIBUTION_FOR_GOAL: "contribution",
  FINAL_BALANCE: "final",
} as const;

type Mode = (typeof MODES)[keyof typeof MODES];

export default function CompoundInterestMoneyCalculator() {
  const [mode, setMode] = useState<Mode>(MODES.TIME_TO_GOAL);

  const [principal, setPrincipal] = useState<number | null>(10000);
  const [weeklyContribution, setWeeklyContribution] = useState<number | null>(
    200,
  );
  const [target, setTarget] = useState<number | null>(100000);
  const [annualRate, setAnnualRate] = useState(7);
  const [durationYears, setDurationYears] = useState(10);

  const [result, setResult] = useState<
    TimeToGoalResult | ContributionResult | FinalBalanceResult | null
  >(null);

  function handleCalculate() {
    const principalValue = principal ?? 0;
    const weeklyContributionValue = weeklyContribution ?? 0;
    const targetValue = target ?? 0;

    if (mode === MODES.TIME_TO_GOAL) {
      setResult(
        calculateTimeToGoal({
          principal: principalValue,
          weeklyContribution: weeklyContributionValue,
          annualRate,
          target: targetValue,
        }),
      );
      return;
    }

    if (mode === MODES.CONTRIBUTION_FOR_GOAL) {
      setResult(
        calculateRequiredWeeklyContribution({
          principal: principalValue,
          annualRate,
          target: targetValue,
          years: durationYears,
        }),
      );
      return;
    }

    setResult(
      calculateFinalBalance({
        principal: principalValue,
        weeklyContribution: weeklyContributionValue,
        annualRate,
        years: durationYears,
      }),
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="flex min-h-[calc(100vh-64px)] justify-center px-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="mt-25 space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
            <h2 className="text-center text-2xl font-semibold">
              Compound Interest Calculator
            </h2>

            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-gray-700 text-sm">
              {Object.entries(MODES).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMode(value);
                    setResult(null);
                  }}
                  className={`py-2 ${
                    mode === value
                      ? "bg-green-600"
                      : "bg-gray-900 text-gray-400"
                  }`}
                >
                  {key
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>

            <MoneyInput
              label="Starting Principal"
              value={principal}
              onChange={setPrincipal}
            />

            {mode !== MODES.CONTRIBUTION_FOR_GOAL && (
              <MoneyInput
                label="Weekly Contribution"
                value={weeklyContribution}
                onChange={setWeeklyContribution}
              />
            )}

            {(mode === MODES.CONTRIBUTION_FOR_GOAL ||
              mode === MODES.FINAL_BALANCE) && (
              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Investment Duration (Years)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={durationYears}
                  onChange={(e) => setDurationYears(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Annual Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
              />
            </div>

            {mode !== MODES.FINAL_BALANCE && (
              <MoneyInput
                label="Target Amount"
                value={target}
                onChange={setTarget}
              />
            )}

            <button
              onClick={handleCalculate}
              className="w-full rounded-md bg-green-600 py-2 font-medium transition hover:bg-green-500"
            >
              Calculate
            </button>
          </div>

          {result && (
            <div className="mb-12 space-y-6 rounded-xl border border-green-700 bg-green-900/20 p-6">
              <h3 className="text-lg font-semibold text-green-400">Results</h3>

              {"finalBalance" in result && (
                <p className="text-lg">
                  💰 Final Balance:{" "}
                  <span className="font-semibold">
                    {formatMoney(result.finalBalance)}
                  </span>
                </p>
              )}

              {"weeklyContribution" in result && (
                <p>
                  💸 Required Weekly Contribution:{" "}
                  <span className="font-semibold">
                    {formatMoney(result.weeklyContribution)}
                  </span>
                </p>
              )}

              {"years" in result && result.years != null && (
                <p>
                  ⏱ {result.years} years {result.months} months
                </p>
              )}

              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={result.chartData}>
                    <XAxis
                      dataKey="week"
                      tickFormatter={(w: number) =>
                        w % 52 === 0 ? `${w / 52}y` : ""
                      }
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number" ? formatMoney(value) : ""
                      }
                      labelFormatter={(l: number) =>
                        `Week ${l} (${(l / 52).toFixed(1)} yrs)`
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

