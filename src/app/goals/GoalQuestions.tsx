"use client";

import { useState } from "react";
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

type TimelineType = "flexible" | "duration";

export default function GoalQuestions() {
  const [goalType, setGoalType] = useState<GoalType>("emergency_fund");
  const [goalName, setGoalName] = useState("");
  const [timelineType, setTimelineType] = useState<TimelineType>("flexible");
  const [durationYears, setDurationYears] = useState<string>("");

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
                    <option value="duration">Set duration</option>
                  </select>
                </div>

                {timelineType === "duration" ? (
                  <div>
                    <label className="mb-1 block text-sm text-gray-300">
                      Duration (years)
                    </label>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={durationYears}
                      onChange={(e) => setDurationYears(e.target.value)}
                      placeholder="e.g. 5"
                      className="h-10 w-full rounded-md border border-gray-700 bg-black px-3"
                    />
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
              {goalType === "retirement" && (
                <p className="text-xs text-gray-400">
                  Tip: experts generally recommend having 10–12× your final
                  annual income saved to maintain your lifestyle in retirement.
                </p>
              )}
              {goalType === "home_down_payment" && (
                <p className="text-xs text-gray-400">
                  Tip: a 20% down payment avoids private mortgage insurance
                  (PMI) and reduces your monthly payment.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

