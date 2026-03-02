"use client";

import { useMemo, useState } from "react";
import Navbar from "@/app/Navbar";

type GoalType =
  | "emergency_fund"
  | "retirement"
  | "home_down_payment"
  | "education"
  | "debt_payoff"
  | "travel"
  | "vehicle"
  | "wedding"
  | "other";

const GOAL_TYPE_OPTIONS: Array<{ value: GoalType; label: string }> = [
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "retirement", label: "Retirement" },
  { value: "home_down_payment", label: "Home down payment" },
  { value: "education", label: "Education" },
  { value: "debt_payoff", label: "Debt payoff" },
  { value: "travel", label: "Travel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "wedding", label: "Wedding" },
  { value: "other", label: "Other" },
];

type TimelineType = "flexible" | "by_date";

function clampToQuarterYears(years: number) {
  if (!Number.isFinite(years) || years <= 0) return 0;
  return Math.round(years * 4) / 4;
}

function yearsUntil(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

export default function GoalQuestions() {
  const [goalType, setGoalType] = useState<GoalType>("emergency_fund");
  const [goalName, setGoalName] = useState("");
  const [timelineType, setTimelineType] = useState<TimelineType>("flexible");
  const [targetDate, setTargetDate] = useState<string>("");

  const computedYears = useMemo(() => {
    if (timelineType !== "by_date" || !targetDate) return null;
    const y = yearsUntil(targetDate);
    return y == null ? null : clampToQuarterYears(y);
  }, [timelineType, targetDate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="flex min-h-[calc(100vh-64px)] justify-center px-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="mt-25 space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
            <h2 className="text-center text-2xl font-semibold">Goals</h2>

            <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-950/40 p-4">
              <h3 className="text-sm font-semibold text-gray-200">
                What are you planning for?
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    Goal type
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as GoalType)}
                    className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
                  >
                    {GOAL_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    Goal name (optional)
                  </label>
                  <input
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g. House down payment"
                    className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    Timeline
                  </label>
                  <select
                    value={timelineType}
                    onChange={(e) =>
                      setTimelineType(e.target.value as TimelineType)
                    }
                    className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="by_date">By a target date</option>
                  </select>
                </div>

                {timelineType === "by_date" ? (
                  <div>
                    <label className="mb-1 block text-sm text-gray-300">
                      Target date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
                    />
                    {computedYears != null && (
                      <p className="mt-1 text-xs text-gray-400">
                        Time horizon: {computedYears} years
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>

              {goalType === "emergency_fund" && (
                <p className="text-xs text-gray-400">
                  Tip: emergency funds are often sized at ~3–6 months of
                  expenses.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

