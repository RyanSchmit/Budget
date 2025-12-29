"use client";

import { useState } from "react";
import Navbar from "../Navbar";
import MoneyInput from "../moneyInput";
import { formatMoney } from "../format";
import { calculateTimeToGoal } from "./goalCalculate";

export default function CompoundInterestInputs() {
  const [principal, setPrincipal] = useState(10000);
  const [weeklyContribution, setWeeklyContribution] = useState(200);
  const [target, setTarget] = useState(100000);
  const [annualRate, setAnnualRate] = useState(7);
  const [result, setResult] = useState(null);

  function handleCalculate() {
    const res = calculateTimeToGoal({
      principal,
      weeklyContribution,
      annualRate,
      target,
    });
    setResult(res);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Input Card */}
          <div className="mt-26 space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-lg">
            <h2 className="text-center text-2xl font-semibold">
              Target Amount Calculator
            </h2>

            <MoneyInput
              label="Starting Principal"
              value={principal}
              onChange={setPrincipal}
            />

            <MoneyInput
              label="Weekly Contribution"
              value={weeklyContribution}
              onChange={setWeeklyContribution}
            />

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Annual Interest Rate (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-gray-700 bg-black px-3 text-white focus:border-green-500 focus:outline-none"
              />
            </div>

            <MoneyInput
              label="Target Amount"
              value={target}
              onChange={setTarget}
            />

            <button
              onClick={handleCalculate}
              className="w-full rounded-md bg-green-600 py-2 font-medium text-white hover:bg-green-500 transition"
            >
              Calculate
            </button>
          </div>

          {/* Result Card */}
          {result && (
            <div className="mb-12 rounded-xl border border-green-700 bg-green-900/20 p-6">
              <h3 className="mb-4 text-lg font-semibold text-green-400">
                Results
              </h3>

              <div className="space-y-2 text-sm">
                <p>
                  ⏱ <span className="text-gray-400">Time to Goal:</span>{" "}
                  <span className="font-medium">
                    {result.years} years {result.months} months
                  </span>
                </p>

                <p>
                  📅 <span className="text-gray-400">Total Weeks:</span>{" "}
                  {result.weeks}
                </p>

                <p>
                  💰 <span className="text-gray-400">Final Balance:</span>{" "}
                  {formatMoney(result.finalBalance)}
                </p>

                <p className="text-gray-400 pt-2">
                  Assumes weekly contributions and weekly compounding at{" "}
                  {annualRate}% annually.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
